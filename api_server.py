"""
DeepGuard - Phase 2 Item 5: FastAPI & WebSocket Telemetry Server (api_server.py)
Exposes REST and WebSocket endpoints for real-time Video KYC verification and
frontend telemetry streaming:
  - GET  /api/health        : Engine status, loaded ViT model, and fusion metrics
  - POST /api/reset         : Resets rolling EAR blink tracker & EMA hysteresis state
  - POST /api/analyze-frame : Analyzes a base64 frame or simulated attack mode
  - WS   /ws/verify         : Streams 24 FPS multi-plane telemetry from webcam or simulator
"""

from __future__ import annotations

import argparse
import asyncio
import base64
from collections import deque
import json
import sys
import time
from typing import Deque, Dict, Optional, Union

import cv2
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from pydantic import BaseModel
import uvicorn

from dataset_generator import _inject_ela_splice_attack, _inject_gan_checkerboard_attack
from engine_cv import (
    BlinkLivenessTracker,
    create_synthetic_test_face,
    get_face_crop_landmarks_and_bbox,
)
from neural_classifier import get_classifier_instance, get_neural_fake_prob
from run_deepguard import TemporalVerdictFilter, process_single_frame
from train_fusion import FUSION_MODEL_PATH, METRICS_JSON_PATH, train_and_evaluate_fusion

app = FastAPI(
    title="DeepGuard Multi-Plane KYC API",
    version="2.0.0",
    description="Real-time anti-spoofing & synthetic identity fraud detection backend",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeFrameRequest(BaseModel):
    image_base64: Optional[str] = None
    mode: str = "genuine_sim"  # "live", "genuine_sim", "replay_sim", "ela_sim", "gan_sim"
    include_annotated_frame: bool = False


class SessionEngineState:
    """Holds per-session rolling EAR blink tracker, EMA filter, and simulation counters."""

    def __init__(self) -> None:
        self.ear_history: Deque[float] = deque(maxlen=30)
        self.blink_tracker = BlinkLivenessTracker(
            threshold=0.22, grace_frames=45, persistence_frames=120
        )
        self.verdict_filter = TemporalVerdictFilter(alpha=0.25)
        self.sim_frame_idx: int = 0
        self.rng = np.random.default_rng(2026)
        self.last_time = time.perf_counter()
        self.fps_ema = 24.0

    def reset(self) -> None:
        self.ear_history.clear()
        self.blink_tracker.reset()
        self.verdict_filter.reset()
        self.sim_frame_idx = 0
        get_classifier_instance().reset_scheduler()


_STATE = SessionEngineState()


def _decode_base64_image(data_uri: str) -> Optional[np.ndarray]:
    try:
        encoded = data_uri.split(",", 1)[1] if "," in data_uri else data_uri
        raw_bytes = base64.b64decode(encoded)
        arr = np.frombuffer(raw_bytes, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def _encode_base64_jpeg(frame: np.ndarray, quality: int = 80) -> str:
    ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), int(quality)])
    if not ok:
        return ""
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def _build_simulated_frame_and_overrides(
    mode: str, state: SessionEngineState
) -> tuple[np.ndarray, Optional[np.ndarray], Optional[np.ndarray]]:
    idx = state.sim_frame_idx
    state.sim_frame_idx += 1

    is_blink_frame = 10 <= (idx % 30) <= 13
    eye_open = 0.11 if (mode == "genuine_sim" and is_blink_frame) else 0.30

    frame = create_synthetic_test_face(360, 360, eye_openness=eye_open, seed=100)
    crop, landmarks, _ = get_face_crop_landmarks_and_bbox(frame)
    if crop is None or landmarks is None:
        return frame, None, None

    pts = landmarks.copy()
    for base_idx in (36, 42):
        mid_y = 0.5 * (pts[base_idx + 0, 1] + pts[base_idx + 3, 1])
        horiz_w = max(float(np.linalg.norm(pts[base_idx + 0] - pts[base_idx + 3])), 12.0)
        half_h = 0.5 * eye_open * horiz_w
        pts[base_idx + 1, 1] = mid_y - half_h
        pts[base_idx + 2, 1] = mid_y - half_h
        pts[base_idx + 5, 1] = mid_y + half_h
        pts[base_idx + 4, 1] = mid_y + half_h

    if mode == "genuine_sim":
        return frame, pts, crop
    elif mode == "replay_sim":
        # Expire cold-start grace period to simulate static photo replay attack
        state.blink_tracker.total_frames = max(state.blink_tracker.total_frames, 60)
        state.blink_tracker.frames_since_blink = 999
        spoof_crop = _inject_ela_splice_attack(crop, state.rng)
        return frame, pts, spoof_crop
    elif mode == "ela_sim":
        state.blink_tracker.total_frames = max(state.blink_tracker.total_frames, 60)
        state.blink_tracker.frames_since_blink = 999
        spoof_crop = _inject_ela_splice_attack(crop, state.rng)
        return frame, pts, spoof_crop
    elif mode == "gan_sim":
        state.blink_tracker.total_frames = max(state.blink_tracker.total_frames, 60)
        state.blink_tracker.frames_since_blink = 999
        spoof_crop = _inject_gan_checkerboard_attack(crop, state.rng)
        return frame, pts, spoof_crop
    else:
        return frame, pts, crop


@app.get("/api/health")
def get_health() -> Dict[str, object]:
    if not FUSION_MODEL_PATH.exists():
        train_and_evaluate_fusion()
    clf = get_classifier_instance()
    clf.load_model()
    metrics = {}
    if METRICS_JSON_PATH.exists():
        with open(METRICS_JSON_PATH, "r", encoding="utf-8") as f:
            metrics = json.load(f)
    return {
        "status": "ok",
        "neural_model": clf.loaded_model_name,
        "keyframe_interval": clf.keyframe_interval,
        "fusion_model_path": str(FUSION_MODEL_PATH),
        "fusion_metrics": metrics,
    }


@app.post("/api/reset")
def reset_session() -> Dict[str, str]:
    _STATE.reset()
    return {"status": "reset"}


@app.post("/api/analyze-frame")
def analyze_frame(req: AnalyzeFrameRequest) -> Dict[str, object]:
    now = time.perf_counter()
    dt = max(now - _STATE.last_time, 1e-3)
    _STATE.last_time = now
    _STATE.fps_ema = 0.85 * _STATE.fps_ema + 0.15 * min(30.0, 1.0 / dt)

    override_pts = None
    override_crop = None
    if req.image_base64:
        frame = _decode_base64_image(req.image_base64)
        if frame is None:
            frame = create_synthetic_test_face(360, 360)
    else:
        frame, override_pts, override_crop = _build_simulated_frame_and_overrides(
            req.mode, _STATE
        )
        if override_crop is not None and (_STATE.sim_frame_idx % 5 == 1):
            _ = get_neural_fake_prob(override_crop, force=True)

    annotated, telemetry = process_single_frame(
        frame,
        _STATE.ear_history,
        current_fps=_STATE.fps_ema,
        override_landmarks=override_pts,
        override_crop=override_crop,
        blink_tracker=_STATE.blink_tracker,
        verdict_filter=_STATE.verdict_filter,
    )

    clf = get_classifier_instance()
    response: Dict[str, object] = {
        **telemetry,
        "neural_raw_vit_prob": round(float(clf.last_raw_hf_prob), 4),
        "blink_count": _STATE.blink_tracker.blink_count,
        "ear_history": [round(float(v), 4) for v in _STATE.blink_tracker.ear_history],
        "mode": req.mode,
    }
    if req.include_annotated_frame:
        response["frame_base64"] = _encode_base64_jpeg(annotated)
    return response


@app.websocket("/ws/verify")
async def websocket_verify(websocket: WebSocket) -> None:
    await websocket.accept()
    state = SessionEngineState()
    mode = "genuine_sim"
    cap = None

    try:
        while True:
            # Check for non-blocking mode switch command from client
            try:
                msg_text = await asyncio.wait_for(websocket.receive_text(), timeout=0.002)
                payload = json.loads(msg_text)
                if "mode" in payload:
                    mode = str(payload["mode"])
                    state.reset()
                    if mode == "webcam" and cap is None:
                        if sys.platform.startswith("win"):
                            cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                        if cap is None or not cap.isOpened():
                            cap = cv2.VideoCapture(0)
            except asyncio.TimeoutError:
                pass

            t0 = time.perf_counter()
            if mode == "webcam" and cap is not None and cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None:
                    frame, override_pts, override_crop = _build_simulated_frame_and_overrides(
                        "genuine_sim", state
                    )
                else:
                    override_pts, override_crop = None, None
            else:
                frame, override_pts, override_crop = _build_simulated_frame_and_overrides(
                    mode, state
                )

            annotated, telemetry = process_single_frame(
                frame,
                state.ear_history,
                current_fps=state.fps_ema,
                override_landmarks=override_pts,
                override_crop=override_crop,
                blink_tracker=state.blink_tracker,
                verdict_filter=state.verdict_filter,
            )

            dt = max(time.perf_counter() - t0, 1e-3)
            state.fps_ema = 0.85 * state.fps_ema + 0.15 * min(30.0, 1.0 / dt)

            await websocket.send_json(
                {
                    **telemetry,
                    "blink_count": state.blink_tracker.blink_count,
                    "ear_history": [round(float(v), 4) for v in state.blink_tracker.ear_history],
                    "frame_base64": _encode_base64_jpeg(annotated, quality=75),
                }
            )
            await asyncio.sleep(0.040)
    except WebSocketDisconnect:
        pass
    finally:
        if cap is not None:
            cap.release()


def run_api_unit_test() -> None:
    """Verifies REST endpoints and Phase 2 telemetry payload structure."""
    print("=== DeepGuard Phase 2 API Server Verification ===")
    health = get_health()
    assert health["status"] == "ok", f"Health check failed: {health}"
    print(f"  [PASS] GET /api/health -> model={health['neural_model']}")

    reset_session()
    for _ in range(20):
        res_gen = analyze_frame(AnalyzeFrameRequest(mode="genuine_sim"))
    assert res_gen["verdict"] == "GENUINE", f"Expected GENUINE in genuine_sim, got {res_gen}"
    print(
        f"  [PASS] POST /api/analyze-frame (genuine_sim) -> "
        f"verdict={res_gen['verdict']}, auth={res_gen['authenticity_score']:.3f}, "
        f"status={res_gen['liveness_status']}"
    )

    reset_session()
    for _ in range(20):
        res_spoof = analyze_frame(AnalyzeFrameRequest(mode="gan_sim"))
    assert res_spoof["verdict"] == "FRAUD DETECTED", (
        f"Expected FRAUD DETECTED in gan_sim, got {res_spoof}"
    )
    print(
        f"  [PASS] POST /api/analyze-frame (gan_sim)     -> "
        f"verdict={res_spoof['verdict']}, auth={res_spoof['authenticity_score']:.3f}, "
        f"status={res_spoof['liveness_status']}"
    )
    print("[SUCCESS] api_server.py Phase 2 verification passed!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DeepGuard FastAPI Server")
    parser.add_argument("--host", type=str, default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--test", action="store_true", help="Run endpoint verification test")
    args = parser.parse_args()

    if args.test:
        run_api_unit_test()
    else:
        uvicorn.run(app, host=args.host, port=args.port)
