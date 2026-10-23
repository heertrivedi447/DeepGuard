"""
DeepGuard - Step 4: Synthetic Calibration Data Generator (dataset_generator.py)
Generates a balanced 100-sample calibration dataset (`dataset/features.csv`) containing:
  - 50 Positive (genuine) samples with natural physiological eye-blink variations
    and clean spatial/spectral facial crops.
  - 50 Negative (synthetic/spoofed) samples spanning:
      1) Static-eye photo/replay attacks (zero physiological blink dip)
      2) Spliced JPEG compression boundary attacks (ELA anomaly)
      3) High-frequency sinusoidal checkerboard GAN upsampling artifacts (FFT anomaly)
      4) Combined multi-plane deepfake reenactment attacks
Extracts the 4D feature vector `[liveness_score, ela_anomaly, fft_anomaly, neural_fake_prob]`
for every sample.
"""

from __future__ import annotations

import csv
from collections import deque
from pathlib import Path
from typing import Deque, Dict, List

import cv2
import numpy as np

from engine_cv import (
    calculate_ela_anomaly,
    calculate_fft_anomaly,
    create_synthetic_test_face,
    evaluate_liveness_ear,
    get_face_crop_and_landmarks,
)
from neural_classifier import get_neural_fake_prob

PROJECT_ROOT = Path(__file__).resolve().parent
DATASET_DIR = PROJECT_ROOT / "dataset"
FEATURES_CSV_PATH = DATASET_DIR / "features.csv"


def _simulate_landmark_sequence(
    base_landmarks: np.ndarray,
    is_genuine_blink: bool,
    rng: np.random.Generator,
) -> float:
    """
    Simulates a 30-frame sequence of 68 facial landmarks and computes the resulting
    Plane B EAR liveness score via `evaluate_liveness_ear`.
    """
    ear_history: Deque[float] = deque(maxlen=30)
    score = 0.0

    blink_start = int(rng.integers(8, 20))
    blink_duration = int(rng.integers(3, 6))

    for frame_idx in range(30):
        pts = base_landmarks.copy()
        if is_genuine_blink:
            # Natural micro-saccades + involuntary blink dip below threshold (0.22)
            if blink_start <= frame_idx < blink_start + blink_duration:
                open_ratio = float(rng.uniform(0.08, 0.17))
            else:
                open_ratio = float(rng.uniform(0.26, 0.34))
        else:
            # Replay / static photo / frozen neural eye state (no physiological dip)
            open_ratio = float(0.29 + rng.normal(0.0, 0.002))

        for base in (36, 42):
            mid_y = 0.5 * (pts[base + 0, 1] + pts[base + 3, 1])
            horiz_w = max(float(np.linalg.norm(pts[base + 0] - pts[base + 3])), 12.0)
            half_h = 0.5 * open_ratio * horiz_w
            pts[base + 1, 1] = mid_y - half_h
            pts[base + 2, 1] = mid_y - half_h
            pts[base + 5, 1] = mid_y + half_h
            pts[base + 4, 1] = mid_y + half_h

        score = evaluate_liveness_ear(pts, ear_history, threshold=0.22)

    return float(score)


def _inject_ela_splice_attack(crop: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """
    Simulates a deepfake face-swap boundary splice by compressing background at quality 50,
    pasting a doubly-compressed high-frequency inner facial region, and creating sharp
    macroblock discontinuities along the splice seam.
    """
    h, w = crop.shape[:2]
    # Recompress base crop at low quality
    _, buf_bg = cv2.imencode(".jpg", crop, [int(cv2.IMWRITE_JPEG_QUALITY), int(rng.integers(45, 65))])
    bg = cv2.imdecode(buf_bg, cv2.IMREAD_COLOR)

    # Create high-frequency spliced inner face patch with unaligned JPEG grid
    spliced = bg.copy()
    y1, y2 = int(h * 0.18), int(h * 0.82)
    x1, x2 = int(w * 0.18), int(w * 0.82)
    inner = crop[y1:y2, x1:x2].astype(np.float32)

    # Add localized high-contrast edge ringing & block boundary artifacts
    seam_noise = rng.integers(-45, 45, size=inner.shape, dtype=np.int16).astype(np.float32)
    inner_manip = np.clip(inner + seam_noise, 0, 255).astype(np.uint8)
    spliced[y1:y2, x1:x2] = inner_manip

    # Draw a sharp 2px boundary transition ring typical of unfeathered mask splicing
    cv2.rectangle(spliced, (x1, y1), (x2, y2), (245, 25, 240), 2)
    return spliced


def _inject_gan_checkerboard_attack(crop: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """
    Injects high-frequency 2D sinusoidal checkerboard grid artifacts characteristic
    of transposed-convolution / deconvolution upsampling in GAN generators.
    """
    h, w = crop.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    freq_x = float(rng.choice([1.5, 2.0, 2.5, 3.0]))
    freq_y = float(rng.choice([1.5, 2.0, 2.5, 3.0]))
    amp = float(rng.uniform(28.0, 48.0))

    grid = amp * np.sin(np.pi * xx / freq_x) * np.cos(np.pi * yy / freq_y)
    radial = amp * 0.5 * np.sin(np.pi * (xx + yy) / 2.0)
    artifact = (grid + radial)[..., np.newaxis]

    manip = np.clip(crop.astype(np.float32) + artifact, 0, 255).astype(np.uint8)
    return manip


def generate_calibration_dataset(
    num_positive: int = 50,
    num_negative: int = 50,
    seed: int = 2026,
) -> List[Dict[str, object]]:
    """
    Generates `num_positive` genuine and `num_negative` synthetic/spoofed samples,
    computes the 4D feature vector for each sample, and saves `dataset/features.csv`.
    """
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(seed)
    rows: List[Dict[str, object]] = []

    print(
        f"[DatasetGenerator] Generating {num_positive} Positive and {num_negative} Negative samples..."
    )

    # Phase 2 Item 2: Capture live physical webcam reference frames if available
    webcam_frames: List[np.ndarray] = []
    try:
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if cap.isOpened():
            for _ in range(10):
                ret, wf = cap.read()
                if ret and wf is not None and wf.size > 0:
                    webcam_frames.append(wf)
            cap.release()
            if webcam_frames:
                print(
                    f"[DatasetGenerator] Captured {len(webcam_frames)} real physical webcam frames for sensor calibration."
                )
    except Exception:
        pass

    # 1. Generate 50 Positive (Genuine) Samples (blending live webcam frames + sensor-calibrated portraits)
    for idx in range(num_positive):
        if webcam_frames and idx < len(webcam_frames):
            frame = webcam_frames[idx].copy()
        else:
            eye_open = float(rng.uniform(0.27, 0.34))
            frame = create_synthetic_test_face(
                width=320,
                height=320,
                eye_openness=eye_open,
                seed=seed + idx,
            )
            # Simulate realistic indoor webcam sensor grain + lens PSF
            iso_grain = rng.normal(0.0, float(rng.uniform(1.2, 3.2)), size=frame.shape).astype(
                np.float32
            )
            frame = np.clip(frame.astype(np.float32) + iso_grain, 0, 255).astype(np.uint8)
            frame = cv2.GaussianBlur(frame, (3, 3), float(rng.uniform(0.7, 1.2)))

        crop, landmarks = get_face_crop_and_landmarks(frame)
        assert crop is not None and landmarks is not None

        liveness_score = _simulate_landmark_sequence(landmarks, is_genuine_blink=True, rng=rng)
        ela_anomaly = calculate_ela_anomaly(crop, quality=90)
        fft_anomaly = calculate_fft_anomaly(crop)
        neural_fake_prob = get_neural_fake_prob(crop, force=True)

        rows.append(
            {
                "sample_id": f"POS_{idx + 1:03d}",
                "attack_type": "genuine_live",
                "liveness_score": round(liveness_score, 5),
                "ela_anomaly": round(ela_anomaly, 5),
                "fft_anomaly": round(fft_anomaly, 5),
                "neural_fake_prob": round(neural_fake_prob, 5),
                "label": "Positive",
                "label_id": 1,
            }
        )

    # 2. Generate 50 Negative (Synthetic / Spoofed) Samples
    attack_modes = [
        "replay_static_eyes",
        "ela_boundary_splice",
        "gan_fft_checkerboard",
        "hybrid_deepfake_stream",
    ]

    for idx in range(num_negative):
        mode = attack_modes[idx % len(attack_modes)]
        frame = create_synthetic_test_face(
            width=320,
            height=320,
            eye_openness=0.29,
            seed=seed + 1000 + idx,
        )
        crop, landmarks = get_face_crop_and_landmarks(frame)
        assert crop is not None and landmarks is not None

        if mode == "replay_static_eyes":
            # Static eyes + recompressed screen capture artifacts
            is_blink = False
            crop = _inject_ela_splice_attack(crop, rng)
        elif mode == "ela_boundary_splice":
            # Spliced JPEG boundary + static/unnatural eyes
            is_blink = False
            crop = _inject_ela_splice_attack(crop, rng)
        elif mode == "gan_fft_checkerboard":
            # High-frequency sinusoidal GAN upsampling grid + static eyes
            is_blink = False
            crop = _inject_gan_checkerboard_attack(crop, rng)
        else:
            # Hybrid full attack: static eyes + spliced boundary + GAN checkerboard
            is_blink = False
            crop = _inject_ela_splice_attack(crop, rng)
            crop = _inject_gan_checkerboard_attack(crop, rng)

        liveness_score = _simulate_landmark_sequence(landmarks, is_genuine_blink=is_blink, rng=rng)
        ela_anomaly = calculate_ela_anomaly(crop, quality=90)
        fft_anomaly = calculate_fft_anomaly(crop)
        neural_fake_prob = get_neural_fake_prob(crop, force=True)

        rows.append(
            {
                "sample_id": f"NEG_{idx + 1:03d}",
                "attack_type": mode,
                "liveness_score": round(liveness_score, 5),
                "ela_anomaly": round(ela_anomaly, 5),
                "fft_anomaly": round(fft_anomaly, 5),
                "neural_fake_prob": round(neural_fake_prob, 5),
                "label": "Negative",
                "label_id": 0,
            }
        )

    fieldnames = [
        "sample_id",
        "attack_type",
        "liveness_score",
        "ela_anomaly",
        "fft_anomaly",
        "neural_fake_prob",
        "label",
        "label_id",
    ]
    with open(FEATURES_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    pos_rows = [r for r in rows if r["label"] == "Positive"]
    neg_rows = [r for r in rows if r["label"] == "Negative"]
    print(f"[DatasetGenerator] Saved {len(rows)} samples to {FEATURES_CSV_PATH}")
    print(
        f"  Positive Mean -> Liveness={np.mean([r['liveness_score'] for r in pos_rows]):.3f}, "
        f"ELA={np.mean([r['ela_anomaly'] for r in pos_rows]):.3f}, "
        f"FFT={np.mean([r['fft_anomaly'] for r in pos_rows]):.3f}, "
        f"NeuralFake={np.mean([r['neural_fake_prob'] for r in pos_rows]):.3f}"
    )
    print(
        f"  Negative Mean -> Liveness={np.mean([r['liveness_score'] for r in neg_rows]):.3f}, "
        f"ELA={np.mean([r['ela_anomaly'] for r in neg_rows]):.3f}, "
        f"FFT={np.mean([r['fft_anomaly'] for r in neg_rows]):.3f}, "
        f"NeuralFake={np.mean([r['neural_fake_prob'] for r in neg_rows]):.3f}"
    )
    return rows


if __name__ == "__main__":
    generate_calibration_dataset()
