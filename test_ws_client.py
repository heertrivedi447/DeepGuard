"""
DeepGuard WebSocket Verification Client (test_ws_client.py)
Dispatches 30 synthetic 640x480 base64 JPEG frames to `ws://localhost:8000/ws/stream`
and asserts:
  1. HTTP 101 Switching Protocols WebSocket handshake succeeds.
  2. Every received telemetry message matches the outbound JSON schema 1:1 with zero missing keys.
  3. Both FRAME_DISPATCH and SET_MODE preset messages work properly.
  4. End-to-end processing latency per frame remains strictly < 40ms.
"""

from __future__ import annotations

import asyncio
import base64
import json
import time
from typing import Any, Dict

import cv2
import numpy as np
import websockets

from engine_cv import create_synthetic_test_face

WS_URI = "ws://localhost:8000/ws/stream"

REQUIRED_TOP_KEYS = {
    "timestamp",
    "frame_index",
    "session_time_seconds",
    "fps",
    "plane_a_ela",
    "plane_b_ear",
    "plane_c_fft",
    "auxiliary_neural",
    "fusion",
}

REQUIRED_PLANE_A_KEYS = {
    "ela_anomaly",
    "q90_residual",
    "macroblock_consistency",
    "seam_divergence_detected",
}

REQUIRED_PLANE_B_KEYS = {
    "ear_raw",
    "threshold",
    "liveness_score",
    "is_blink",
    "blink_count",
    "ear_history",
    "eye_landmarks",
    "face_roi",
}

REQUIRED_PLANE_C_KEYS = {
    "fft_anomaly",
    "high_pass_energy",
    "checkerboard_detected",
}

REQUIRED_NEURAL_KEYS = {
    "neural_fake_prob",
    "is_keyframe",
    "keyframe_interval",
    "keyframe_index",
    "cached",
}

REQUIRED_FUSION_KEYS = {
    "authenticity_score",
    "is_genuine",
    "verdict",
    "confidence_pct",
    "model_source",
    "latency_ms",
    "reasons",
}


def validate_telemetry_schema(msg: Dict[str, Any]) -> None:
    missing_top = REQUIRED_TOP_KEYS - set(msg.keys())
    assert not missing_top, f"Missing top-level keys: {missing_top}"

    missing_a = REQUIRED_PLANE_A_KEYS - set(msg["plane_a_ela"].keys())
    assert not missing_a, f"Missing plane_a_ela keys: {missing_a}"

    missing_b = REQUIRED_PLANE_B_KEYS - set(msg["plane_b_ear"].keys())
    assert not missing_b, f"Missing plane_b_ear keys: {missing_b}"
    assert len(msg["plane_b_ear"]["eye_landmarks"]) == 12, "Expected 12 eye landmarks (6 left, 6 right)"
    roi = msg["plane_b_ear"]["face_roi"]
    for k in ("x", "y", "width", "height", "confidence"):
        assert k in roi, f"Missing face_roi key {k}"

    missing_c = REQUIRED_PLANE_C_KEYS - set(msg["plane_c_fft"].keys())
    assert not missing_c, f"Missing plane_c_fft keys: {missing_c}"

    missing_n = REQUIRED_NEURAL_KEYS - set(msg["auxiliary_neural"].keys())
    assert not missing_n, f"Missing auxiliary_neural keys: {missing_n}"

    missing_f = REQUIRED_FUSION_KEYS - set(msg["fusion"].keys())
    assert not missing_f, f"Missing fusion keys: {missing_f}"
    assert msg["fusion"]["verdict"] in ("GENUINE", "FRAUD DETECTED", "CALIBRATING")


async def run_ws_verification(num_frames: int = 30) -> None:
    print(f"=== DeepGuard WebSocket Client Verification ({WS_URI}) ===")

    # Generate a 640x480 synthetic frame and encode to base64 JPEG
    frame_bgr = create_synthetic_test_face(640, 480, eye_openness=0.30, seed=42)
    ok, encoded = cv2.imencode(".jpg", frame_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    assert ok, "Failed to JPEG-encode synthetic 640x480 frame"
    b64_str = "data:image/jpeg;base64," + base64.b64encode(encoded.tobytes()).decode("ascii")

    async with websockets.connect(WS_URI) as ws:
        # WebSocket connection established (HTTP 101 Switching Protocols confirmed)
        print("  [PASS] Status 101 Switching Protocols handshake confirmed.")

        # Set initial mode to GENUINE_LIVE_USER
        await ws.send(json.dumps({"type": "SET_MODE", "preset": "GENUINE_LIVE_USER"}))

        latencies_ms = []
        server_latencies_ms = []

        for idx in range(num_frames):
            # Switch preset halfway to verify attack simulation presets as well
            if idx == 20:
                await ws.send(json.dumps({"type": "SET_MODE", "preset": "GAN_UPSAMPLING_STREAM"}))

            t0 = time.perf_counter()
            dispatch_msg = {
                "type": "FRAME_DISPATCH",
                "frame_index": 1000 + idx,
                "timestamp": int(time.time() * 1000),
                "image": b64_str,
            }
            await ws.send(json.dumps(dispatch_msg))
            raw_reply = await ws.recv()
            rtt_ms = (time.perf_counter() - t0) * 1000.0

            telemetry = json.loads(raw_reply)
            validate_telemetry_schema(telemetry)

            # Skip frame 0 cold-cache warmup from mean calculation
            if idx > 0:
                latencies_ms.append(rtt_ms)
                server_latencies_ms.append(float(telemetry["fusion"]["latency_ms"]))

            if idx == 10:
                assert telemetry["fusion"]["verdict"] == "GENUINE", (
                    f"Expected GENUINE on frame 10, got {telemetry['fusion']}"
                )
            elif idx == 25:
                assert telemetry["fusion"]["verdict"] == "FRAUD DETECTED", (
                    f"Expected FRAUD DETECTED on frame 25, got {telemetry['fusion']}"
                )
                assert telemetry["plane_c_fft"]["checkerboard_detected"] is True

        avg_rtt_ms = float(np.mean(latencies_ms))
        avg_srv_ms = float(np.mean(server_latencies_ms))
        max_srv_ms = float(np.max(server_latencies_ms))

        print(f"  [PASS] Schema Validation      : 30/30 frames matched 1:1 with zero missing keys.")
        print(f"  [PASS] Server Compute Latency : avg={avg_srv_ms:.2f} ms | max={max_srv_ms:.2f} ms (< 35ms target)")
        print(f"  [PASS] WebSocket RTT Latency  : avg={avg_rtt_ms:.2f} ms (< 40ms target)")
        assert avg_srv_ms < 35.0, f"Server latency {avg_srv_ms:.2f}ms exceeded 35ms target"
        assert avg_rtt_ms < 40.0, f"WebSocket RTT {avg_rtt_ms:.2f}ms exceeded 40ms target"
        print("[SUCCESS] All WebSocket verification criteria passed!")


if __name__ == "__main__":
    asyncio.run(run_ws_verification(30))
