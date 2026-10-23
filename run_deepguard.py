"""
DeepGuard - Step 6: Master Real-Time Verification Pipeline (run_deepguard.py)
Binds webcam capture, video file input, or a mock video stream to the multi-plane
Defense-in-Depth detection engine:
  - Plane A (Spatial)    : Error Level Analysis (ELA)
  - Plane B (Biological) : Eye Aspect Ratio (EAR) Liveness
  - Plane C (Spectral)   : 2D Fast Fourier Transform (FFT) High-Frequency Analysis
  - Auxiliary Layer      : Pre-Trained Hugging Face Deepfake ViT/SigLIP Classifier
  - Fusion Engine        : Calibrated Ensemble Classifier (`assets/fusion_model.joblib`)
                           with heuristic fallback formula.
Overlays real-time telemetry HUD (bounding box, EAR gauge, ELA/FFT meters, FPS counter,
and GENUINE / FRAUD DETECTED badge) and includes an end-to-end verification unit test.
"""

from __future__ import annotations

import argparse
import sys
import time
from collections import deque
from pathlib import Path
from typing import Deque, Dict, Optional, Tuple, Union

import cv2
import numpy as np

from dataset_generator import _inject_ela_splice_attack, _inject_gan_checkerboard_attack
from engine_cv import (
    BlinkLivenessTracker,
    calculate_ela_anomaly,
    calculate_fft_anomaly,
    compute_ear_from_landmarks,
    create_synthetic_test_face,
    evaluate_liveness_ear,
    get_face_crop_landmarks_and_bbox,
)
from neural_classifier import get_classifier_instance, get_neural_fake_prob
from train_fusion import FUSION_MODEL_PATH, predict_authenticity, train_and_evaluate_fusion

PROJECT_ROOT = Path(__file__).resolve().parent
ASSETS_DIR = PROJECT_ROOT / "assets"


def _draw_meter_bar(
    canvas: np.ndarray,
    x: int,
    y: int,
    width: int,
    height: int,
    value: float,
    label: str,
    invert_color: bool = False,
) -> None:
    """Draws a labeled telemetry progress bar on the HUD overlay."""
    val_clamped = float(np.clip(value, 0.0, 1.0))
    fill_w = int(round(width * val_clamped))

    # Color logic: green for safe, red/orange for anomalous
    risk = (1.0 - val_clamped) if invert_color else val_clamped
    if risk < 0.40:
        bar_color = (40, 210, 60)  # Green (BGR)
    elif risk < 0.65:
        bar_color = (0, 190, 255)  # Amber (BGR)
    else:
        bar_color = (30, 40, 235)  # Red (BGR)

    cv2.rectangle(canvas, (x, y), (x + width, y + height), (55, 60, 70), -1)
    if fill_w > 0:
        cv2.rectangle(canvas, (x, y), (x + fill_w, y + height), bar_color, -1)
    cv2.rectangle(canvas, (x, y), (x + width, y + height), (180, 185, 195), 1)

    cv2.putText(
        canvas,
        f"{label}: {val_clamped:.2f}",
        (x, y - 5),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.42,
        (235, 240, 245),
        1,
        cv2.LINE_AA,
    )


def render_telemetry_overlay(
    frame: np.ndarray,
    bbox: Optional[Tuple[int, int, int, int]],
    landmarks: Optional[np.ndarray],
    telemetry: Dict[str, Union[float, bool, str]],
) -> np.ndarray:
    """
    Overlays real-time DeepGuard telemetry onto the frame:
      - Face bounding box & eye landmark polylines
      - EAR gauge & liveness meter
      - ELA & FFT anomaly meters
      - FPS counter
      - Authenticity badge (`GENUINE` in green vs. `FRAUD DETECTED` in red)
    """
    annotated = frame.copy()
    fh, fw = annotated.shape[:2]

    is_genuine = bool(telemetry["is_genuine"])
    badge_text = "GENUINE" if is_genuine else "FRAUD DETECTED"
    badge_color = (30, 200, 50) if is_genuine else (25, 30, 235)  # BGR Green vs Red

    # 1. Face bounding box & eye landmarks
    if bbox is not None:
        x1, y1, x2, y2 = bbox
        cv2.rectangle(annotated, (x1, y1), (x2, y2), badge_color, 2)
        cv2.putText(
            annotated,
            f"Auth: {float(telemetry['authenticity_score']) * 100:.1f}%",
            (x1, max(18, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.50,
            badge_color,
            2,
            cv2.LINE_AA,
        )

    if landmarks is not None and landmarks.shape == (68, 2):
        for eye_slice in (slice(36, 42), slice(42, 48)):
            eye_pts = landmarks[eye_slice].astype(np.int32).reshape((-1, 1, 2))
            cv2.polylines(annotated, [eye_pts], isClosed=True, color=(255, 230, 0), thickness=1)

    # 2. Semi-transparent dark telemetry HUD panel on the left
    panel_w = min(210, fw - 10)
    panel_h = min(230, fh - 10)
    sub = annotated[5 : 5 + panel_h, 5 : 5 + panel_w]
    dark_rect = np.full_like(sub, 22)
    annotated[5 : 5 + panel_h, 5 : 5 + panel_w] = cv2.addWeighted(sub, 0.35, dark_rect, 0.65, 0)

    # Header & FPS Counter
    fps_val = float(telemetry["fps"])
    cv2.putText(
        annotated,
        f"DEEPGUARD KYC | FPS: {fps_val:.1f}",
        (14, 24),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.44,
        (0, 235, 255),
        1,
        cv2.LINE_AA,
    )

    # EAR Gauge readout
    ear_val = float(telemetry["ear_raw"])
    cv2.putText(
        annotated,
        f"EAR Gauge: {ear_val:.3f} (Thr: 0.22)",
        (14, 44),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.40,
        (210, 220, 230),
        1,
        cv2.LINE_AA,
    )

    # Telemetry meters
    bar_w = panel_w - 24
    _draw_meter_bar(
        annotated, 14, 65, bar_w, 10, float(telemetry["liveness_score"]), "Plane B Liveness (EAR)", invert_color=True
    )
    _draw_meter_bar(
        annotated, 14, 100, bar_w, 10, float(telemetry["ela_anomaly"]), "Plane A ELA Anomaly"
    )
    _draw_meter_bar(
        annotated, 14, 135, bar_w, 10, float(telemetry["fft_anomaly"]), "Plane C FFT Anomaly"
    )
    _draw_meter_bar(
        annotated, 14, 170, bar_w, 10, float(telemetry["neural_fake_prob"]), "Neural Deepfake Prob"
    )

    # 3. Authenticity Verdict Badge (`GENUINE` in green vs `FRAUD DETECTED` in red)
    badge_y1, badge_y2 = 192, 224
    cv2.rectangle(annotated, (14, badge_y1), (14 + bar_w, badge_y2), badge_color, -1)
    cv2.rectangle(annotated, (14, badge_y1), (14 + bar_w, badge_y2), (245, 245, 245), 1)
    cv2.putText(
        annotated,
        badge_text,
        (22, badge_y1 + 21),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.52,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )

    return annotated


class TemporalVerdictFilter:
    """
    Phase 2 Item 3: Exponential Moving Average (EMA) & Hysteresis filter on the
    final authenticity score to eliminate single-frame flicker caused by rapid head
    motion or transient camera auto-exposure steps.
    """

    def __init__(
        self,
        alpha: float = 0.25,
        enter_genuine_thresh: float = 0.50,
        exit_genuine_thresh: float = 0.43,
    ) -> None:
        self.alpha = float(alpha)
        self.enter_genuine_thresh = float(enter_genuine_thresh)
        self.exit_genuine_thresh = float(exit_genuine_thresh)
        self.auth_ema: Optional[float] = None
        self.is_genuine_state: bool = True

    def reset(self) -> None:
        self.auth_ema = None
        self.is_genuine_state = True

    def update(self, raw_auth_score: float) -> Tuple[bool, float]:
        score = float(np.clip(raw_auth_score, 0.0, 1.0))
        if self.auth_ema is None:
            self.auth_ema = score
        else:
            self.auth_ema = (1.0 - self.alpha) * self.auth_ema + self.alpha * score

        if self.is_genuine_state:
            if self.auth_ema < self.exit_genuine_thresh:
                self.is_genuine_state = False
        else:
            if self.auth_ema >= self.enter_genuine_thresh:
                self.is_genuine_state = True

        return self.is_genuine_state, float(self.auth_ema)


def process_single_frame(
    frame: np.ndarray,
    ear_history: Deque[float],
    current_fps: float = 25.0,
    override_landmarks: Optional[np.ndarray] = None,
    override_crop: Optional[np.ndarray] = None,
    blink_tracker: Optional[BlinkLivenessTracker] = None,
    verdict_filter: Optional[TemporalVerdictFilter] = None,
) -> Tuple[np.ndarray, Dict[str, Union[float, bool, str]]]:
    """
    Executes one complete multi-plane detection pass on `frame`:
      1. Extracts face ROI & 68 landmarks
      2. Computes Plane A (ELA), Plane B (EAR), Plane C (FFT), and Neural Fake Probability
      3. Evaluates Ensemble Fusion Model (`assets/fusion_model.joblib` or fallback heuristic)
      4. Applies optional Phase 2 Blink Persistence & Temporal EMA Hysteresis
      5. Renders real-time telemetry HUD overlay
    """
    crop, landmarks, bbox = get_face_crop_landmarks_and_bbox(frame, margin=0.15)
    if override_crop is not None:
        crop = override_crop
    if override_landmarks is not None:
        landmarks = override_landmarks

    if crop is None or landmarks is None:
        telemetry: Dict[str, Union[float, bool, str]] = {
            "ear_raw": 0.0,
            "liveness_score": 0.0,
            "liveness_status": "NO_FACE",
            "ela_anomaly": 0.0,
            "fft_anomaly": 0.0,
            "neural_fake_prob": 0.5,
            "authenticity_score": 0.0,
            "is_genuine": False,
            "verdict": "FRAUD DETECTED",
            "fps": float(current_fps),
        }
        annotated = render_telemetry_overlay(frame, None, None, telemetry)
        return annotated, telemetry

    ear_raw = compute_ear_from_landmarks(landmarks)
    if blink_tracker is not None:
        liveness_score, liveness_status = blink_tracker.update(landmarks)
        # Keep ear_history synchronized for external callers
        ear_history.clear()
        ear_history.extend(blink_tracker.ear_history)
    else:
        liveness_score = evaluate_liveness_ear(landmarks, ear_history, threshold=0.22)
        liveness_status = "BLINK_VERIFIED" if liveness_score >= 0.70 else "WINDOW_EVAL"

    ela_anomaly = calculate_ela_anomaly(crop, quality=90)
    fft_anomaly = calculate_fft_anomaly(crop)
    neural_fake_prob = get_neural_fake_prob(crop, force=False)

    is_genuine_raw, auth_score_raw = predict_authenticity(
        liveness_score=liveness_score,
        ela_anomaly=ela_anomaly,
        fft_anomaly=fft_anomaly,
        neural_fake_prob=neural_fake_prob,
    )

    if verdict_filter is not None:
        is_genuine, auth_score = verdict_filter.update(auth_score_raw)
    else:
        is_genuine, auth_score = is_genuine_raw, auth_score_raw

    telemetry = {
        "ear_raw": float(ear_raw),
        "liveness_score": float(liveness_score),
        "liveness_status": str(liveness_status),
        "ela_anomaly": float(ela_anomaly),
        "fft_anomaly": float(fft_anomaly),
        "neural_fake_prob": float(neural_fake_prob),
        "authenticity_score": float(auth_score),
        "authenticity_raw": float(auth_score_raw),
        "is_genuine": bool(is_genuine),
        "verdict": "GENUINE" if is_genuine else "FRAUD DETECTED",
        "fps": float(current_fps),
    }

    annotated = render_telemetry_overlay(frame, bbox, landmarks, telemetry)
    return annotated, telemetry


def run_video_pipeline(
    source: Union[int, str] = 0,
    max_frames: int = 0,
    display: bool = True,
) -> Dict[str, float]:
    """
    Runs the real-time DeepGuard pipeline on a physical webcam (`source=0`) or video file path.
    Uses `cv2.CAP_DSHOW` on Windows for instant physical webcam initialization and displays
    the live `DeepGuard Video Stream` window until the user presses 'q'.
    """
    if not FUSION_MODEL_PATH.exists():
        train_and_evaluate_fusion()

    clf = get_classifier_instance()
    clf.load_model()
    clf.reset_scheduler()

    # Use cv2.CAP_DSHOW on Windows for instant camera initialization
    if isinstance(source, int) and sys.platform.startswith("win"):
        cap = cv2.VideoCapture(source, cv2.CAP_DSHOW)
        if not cap.isOpened():
            # Fallback to default backend if index 0 or DSHOW is busy
            cap = cv2.VideoCapture(source)
    else:
        cap = cv2.VideoCapture(source)

    use_mock_stream = not cap.isOpened()
    if use_mock_stream:
        print(
            f"[DeepGuard] Camera/source '{source}' unavailable; binding synthetic fallback stream."
        )
        mock_open = create_synthetic_test_face(360, 360, eye_openness=0.30, seed=100)
        mock_blink = create_synthetic_test_face(360, 360, eye_openness=0.11, seed=100)
        ear_warmup: Deque[float] = deque(maxlen=30)
        _ = process_single_frame(mock_open, ear_warmup, current_fps=24.0)
        if max_frames <= 0 and not display:
            max_frames = 60
    else:
        print(
            f"[DeepGuard] Live camera initialized (source={source}). "
            f"Press 'q' in the 'DeepGuard Video Stream' window to exit."
        )

    ear_history: Deque[float] = deque(maxlen=30)
    blink_tracker = BlinkLivenessTracker(threshold=0.22, grace_frames=45, persistence_frames=120)
    verdict_filter = TemporalVerdictFilter(alpha=0.25)
    frame_times = []
    fps_ema = 24.0
    idx = 0

    if display:
        cv2.namedWindow("DeepGuard Video Stream", cv2.WINDOW_NORMAL)
        try:
            cv2.setWindowProperty("DeepGuard Video Stream", cv2.WND_PROP_TOPMOST, 1)
        except Exception:
            pass

    while True:
        if max_frames > 0 and idx >= max_frames:
            break

        if not use_mock_stream:
            ret, frame = cap.read()
            if not ret or frame is None:
                break
        else:
            frame = mock_blink if (10 <= (idx % 30) <= 13) else mock_open

        t0 = time.perf_counter()
        annotated, telemetry = process_single_frame(
            frame,
            ear_history,
            current_fps=fps_ema,
            blink_tracker=blink_tracker,
            verdict_filter=verdict_filter,
        )
        if use_mock_stream:
            elapsed = time.perf_counter() - t0
            if elapsed < 0.041:
                time.sleep(max(0.0, 0.041 - elapsed))
        dt = time.perf_counter() - t0
        frame_times.append(dt)
        inst_fps = 1.0 / max(dt, 1e-4)
        fps_ema = 0.85 * fps_ema + 0.15 * inst_fps
        idx += 1

        if display:
            cv2.imshow("DeepGuard Video Stream", annotated)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    if not use_mock_stream:
        cap.release()
    if display:
        cv2.destroyAllWindows()

    avg_dt = float(np.mean(frame_times)) if frame_times else 0.04
    sustained_fps = 1.0 / max(avg_dt, 1e-4)
    return {
        "frames_processed": float(len(frame_times)),
        "avg_frame_ms": avg_dt * 1000.0,
        "sustained_fps": sustained_fps,
    }


def run_verification_unit_test() -> Dict[str, float]:
    """
    Step 6.3 Verification Unit Test:
    Runs the end-to-end DeepGuard processing loop on mock video frames (both genuine
    blinking sequence and spoofed GAN/ELA attack sequence), asserts no exceptions occur,
    saves visual telemetry snapshots to `assets/`, and verifies >= 20 FPS throughput.
    """
    print("=== DeepGuard End-to-End Pipeline Verification Test ===")
    if not FUSION_MODEL_PATH.exists():
        train_and_evaluate_fusion()

    clf = get_classifier_instance()
    clf.load_model()
    clf.reset_scheduler()

    rng = np.random.default_rng(77)
    base_frame = create_synthetic_test_face(360, 360, eye_openness=0.30, seed=77)
    base_crop, base_landmarks, _ = get_face_crop_landmarks_and_bbox(base_frame)
    assert base_crop is not None and base_landmarks is not None

    # Warm-up neural model once so model initialization is not counted inside frame loop timing
    _ = get_neural_fake_prob(base_crop, force=True)
    clf.reset_scheduler()

    # 1. Run 30-frame Genuine sequence (natural blink on frames 12..15)
    ear_history_gen: Deque[float] = deque(maxlen=30)
    frame_durations = []
    fps_tracker = 25.0
    last_gen_frame = None
    last_gen_telemetry = None

    for i in range(30):
        t0 = time.perf_counter()
        pts = base_landmarks.copy()
        open_ratio = 0.11 if (12 <= i <= 15) else 0.30
        for base_idx in (36, 42):
            mid_y = 0.5 * (pts[base_idx + 0, 1] + pts[base_idx + 3, 1])
            horiz_w = max(float(np.linalg.norm(pts[base_idx + 0] - pts[base_idx + 3])), 12.0)
            half_h = 0.5 * open_ratio * horiz_w
            pts[base_idx + 1, 1] = mid_y - half_h
            pts[base_idx + 2, 1] = mid_y - half_h
            pts[base_idx + 5, 1] = mid_y + half_h
            pts[base_idx + 4, 1] = mid_y + half_h

        annotated, telemetry = process_single_frame(
            base_frame,
            ear_history_gen,
            current_fps=fps_tracker,
            override_landmarks=pts,
            override_crop=base_crop,
        )
        dt = time.perf_counter() - t0
        frame_durations.append(dt)
        fps_tracker = 1.0 / max(float(np.mean(frame_durations)), 1e-4)
        last_gen_frame = annotated
        last_gen_telemetry = telemetry

    assert last_gen_frame is not None and last_gen_telemetry is not None
    assert last_gen_telemetry["verdict"] == "GENUINE", f"Expected GENUINE, got {last_gen_telemetry}"

    # 2. Run 30-frame Spoof / Deepfake Attack sequence (static eyes + ELA splice + GAN grid)
    ear_history_spoof: Deque[float] = deque(maxlen=30)
    spoof_crop = _inject_ela_splice_attack(base_crop, rng)
    spoof_crop = _inject_gan_checkerboard_attack(spoof_crop, rng)
    # Force keyframe refresh on attack transition
    _ = get_neural_fake_prob(spoof_crop, force=True)
    last_spoof_frame = None
    last_spoof_telemetry = None

    for i in range(30):
        t0 = time.perf_counter()
        pts = base_landmarks.copy()
        annotated, telemetry = process_single_frame(
            base_frame,
            ear_history_spoof,
            current_fps=fps_tracker,
            override_landmarks=pts,
            override_crop=spoof_crop,
        )
        dt = time.perf_counter() - t0
        frame_durations.append(dt)
        fps_tracker = 1.0 / max(float(np.mean(frame_durations)), 1e-4)
        last_spoof_frame = annotated
        last_spoof_telemetry = telemetry

    assert last_spoof_frame is not None and last_spoof_telemetry is not None
    assert last_spoof_telemetry["verdict"] == "FRAUD DETECTED", (
        f"Expected FRAUD DETECTED, got {last_spoof_telemetry}"
    )

    # Save telemetry demo snapshots to assets/
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(ASSETS_DIR / "telemetry_genuine.png"), last_gen_frame)
    cv2.imwrite(str(ASSETS_DIR / "telemetry_fraud.png"), last_spoof_frame)

    avg_ms = float(np.mean(frame_durations)) * 1000.0
    sustained_fps = 1000.0 / max(avg_ms, 1e-3)

    print(
        f"  [PASS] Genuine Frame Verdict : {last_gen_telemetry['verdict']} "
        f"(Auth={last_gen_telemetry['authenticity_score']:.3f}, "
        f"EAR_Live={last_gen_telemetry['liveness_score']:.3f})"
    )
    print(
        f"  [PASS] Spoofed Frame Verdict : {last_spoof_telemetry['verdict']} "
        f"(Auth={last_spoof_telemetry['authenticity_score']:.3f}, "
        f"ELA={last_spoof_telemetry['ela_anomaly']:.3f}, "
        f"FFT={last_spoof_telemetry['fft_anomaly']:.3f})"
    )
    print(f"  [PASS] End-to-End Throughput : {sustained_fps:.2f} FPS ({avg_ms:.2f} ms/frame)")
    assert sustained_fps >= 20.0, f"Expected >= 20 FPS, got {sustained_fps:.2f} FPS"
    print("[SUCCESS] Master real-time pipeline verification passed!")

    return {
        "sustained_fps": sustained_fps,
        "avg_frame_ms": avg_ms,
        "genuine_auth_score": float(last_gen_telemetry["authenticity_score"]),
        "fraud_auth_score": float(last_spoof_telemetry["authenticity_score"]),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DeepGuard Multi-Plane Video KYC Engine")
    parser.add_argument("--source", type=str, default="0", help="Webcam index (0) or path to video file")
    parser.add_argument(
        "--frames",
        type=int,
        default=0,
        help="Number of frames to process (0 = run continuously until 'q' is pressed)",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run without opening the live OpenCV window",
    )
    parser.add_argument("--test-only", action="store_true", help="Run verification unit test suite")
    args = parser.parse_args()

    if args.test_only:
        run_verification_unit_test()
    else:
        src: Union[int, str] = int(args.source) if args.source.isdigit() else args.source
        stats = run_video_pipeline(
            source=src,
            max_frames=args.frames,
            display=not args.headless,
        )
        print(
            f"[Pipeline Run Complete] Processed {int(stats['frames_processed'])} frames "
            f"at {stats['sustained_fps']:.2f} FPS ({stats['avg_frame_ms']:.2f} ms/frame)."
        )
