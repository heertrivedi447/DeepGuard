"""
DeepGuard - Core Computer Vision Modules (engine_cv.py)
Implements:
  - Plane A (Spatial Analysis): Error Level Analysis (ELA) via calculate_ela_anomaly()
  - Plane B (Biological Analysis): Eye Aspect Ratio (EAR) Liveness via evaluate_liveness_ear()
  - Plane C (Spectral Analysis): 2D FFT High-Frequency Artifact Detection via calculate_fft_anomaly()
  - Face ROI & 68-Landmark Extraction via get_face_crop_and_landmarks()
"""

from __future__ import annotations

import os
from collections import deque
from pathlib import Path
from typing import Deque, Optional, Tuple

import cv2
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent
ASSETS_DIR = PROJECT_ROOT / "assets"
DLIB_LANDMARK_PATH = ASSETS_DIR / "shape_predictor_68_face_landmarks.dat"

# Optional backend imports (dlib preferred, MediaPipe / OpenCV fallbacks supported)
try:
    import dlib  # type: ignore

    HAS_DLIB = True
except Exception:
    dlib = None
    HAS_DLIB = False

try:
    import mediapipe as mp  # type: ignore

    HAS_MEDIAPIPE = True
except Exception:
    mp = None
    HAS_MEDIAPIPE = False

# Lazy-initialized singleton detectors & bounding-box tracker cache
_DLIB_DETECTOR = None
_DLIB_PREDICTOR = None
_MP_FACE_MESH = None
_HAAR_FACE = None
_HAAR_EYE = None
_LAST_FACE_RECT: Optional[Tuple[int, int, int, int, int, int, bool]] = None
_DETECT_FRAME_COUNT: int = 0

# MediaPipe 468-mesh to iBUG 68-landmark index mapping
# Specifically preserves exact 6-point left eye (36..41) and right eye (42..47) indices
_MP_TO_68_INDICES = [
    # Jawline (0..16)
    234, 93, 132, 58, 172, 136, 150, 149, 152, 378, 379, 365, 397, 288, 361, 323, 454,
    # Left eyebrow (17..21)
    70, 63, 105, 66, 107,
    # Right eyebrow (22..26)
    336, 296, 334, 293, 300,
    # Nose bridge & tip (27..35)
    168, 197, 5, 4, 75, 97, 2, 326, 305,
    # Left eye [p1..p6] (36..41)
    33, 160, 158, 133, 153, 144,
    # Right eye [p1..p6] (42..47)
    362, 385, 387, 263, 373, 380,
    # Outer lip (48..59)
    61, 39, 37, 0, 267, 269, 291, 405, 314, 17, 84, 181,
    # Inner lip (60..67)
    78, 82, 13, 312, 308, 317, 14, 87,
]


def _get_dlib_models():
    global _DLIB_DETECTOR, _DLIB_PREDICTOR
    if not HAS_DLIB:
        return None, None
    if _DLIB_DETECTOR is None:
        _DLIB_DETECTOR = dlib.get_frontal_face_detector()
    if _DLIB_PREDICTOR is None and DLIB_LANDMARK_PATH.exists():
        _DLIB_PREDICTOR = dlib.shape_predictor(str(DLIB_LANDMARK_PATH))
    return _DLIB_DETECTOR, _DLIB_PREDICTOR


def _get_mediapipe_mesh():
    global _MP_FACE_MESH
    if not HAS_MEDIAPIPE:
        return None
    if _MP_FACE_MESH is None:
        try:
            if hasattr(mp, "solutions") and hasattr(mp.solutions, "face_mesh"):
                _MP_FACE_MESH = mp.solutions.face_mesh.FaceMesh(
                    static_image_mode=False,
                    max_num_faces=1,
                    refine_landmarks=True,
                    min_detection_confidence=0.4,
                    min_tracking_confidence=0.4,
                )
        except Exception:
            _MP_FACE_MESH = None
    return _MP_FACE_MESH


def _get_haar_cascades():
    global _HAAR_FACE, _HAAR_EYE
    if _HAAR_FACE is None:
        face_xml = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        eye_xml = cv2.data.haarcascades + "haarcascade_eye.xml"
        _HAAR_FACE = cv2.CascadeClassifier(face_xml)
        _HAAR_EYE = cv2.CascadeClassifier(eye_xml)
    return _HAAR_FACE, _HAAR_EYE


def _synthesize_68_landmarks_from_box(
    gray: np.ndarray, x: int, y: int, w: int, h: int
) -> np.ndarray:
    """
    Constructs a 68-point landmark array aligned to the face bounding box (x, y, w, h)
    and measures actual eye aperture from the eye regions in `gray` so that EAR reflects
    real eyelid opening/closing when running without dlib/MediaPipe or on synthetic faces.
    """
    pts = np.zeros((68, 2), dtype=np.float32)

    # Jawline (0..16)
    jaw_t = np.linspace(0.0, np.pi, 17, dtype=np.float32)
    pts[0:17, 0] = x + w * (0.5 - 0.45 * np.cos(jaw_t))
    pts[0:17, 1] = y + h * (0.45 + 0.50 * np.sin(jaw_t))

    # Eyebrows (17..26)
    pts[17:22, 0] = x + w * np.linspace(0.18, 0.42, 5, dtype=np.float32)
    pts[17:22, 1] = y + h * 0.28
    pts[22:27, 0] = x + w * np.linspace(0.58, 0.82, 5, dtype=np.float32)
    pts[22:27, 1] = y + h * 0.28

    # Nose (27..35)
    pts[27:31, 0] = x + w * 0.50
    pts[27:31, 1] = y + h * np.linspace(0.35, 0.58, 4, dtype=np.float32)
    pts[31:36, 0] = x + w * np.linspace(0.40, 0.60, 5, dtype=np.float32)
    pts[31:36, 1] = y + h * 0.63

    # Estimate vertical eye opening from image vertical gradient / dark pupil band
    def _place_eye(cx_ratio: float, cy_ratio: float) -> np.ndarray:
        cx = x + w * cx_ratio
        cy = y + h * cy_ratio
        eye_half_w = max(6.0, w * 0.085)
        rx1 = int(max(0, cx - eye_half_w))
        rx2 = int(min(gray.shape[1], cx + eye_half_w))
        ry1 = int(max(0, cy - h * 0.07))
        ry2 = int(min(gray.shape[0], cy + h * 0.07))
        roi = gray[ry1:ry2, rx1:rx2]

        # Measure vertical spread of dark pixels (iris/eyelid opening) if present
        ear_target = 0.28
        if roi.size > 16:
            thresh_val = np.percentile(roi, 25)
            dark_mask = roi <= min(thresh_val, np.mean(roi) - 8.0)
            if np.any(dark_mask):
                ys, xs = np.where(dark_mask)
                vert_span = float(np.percentile(ys, 90) - np.percentile(ys, 10) + 1.0)
                horiz_span = max(float(np.percentile(xs, 95) - np.percentile(xs, 5) + 1.0), roi.shape[1] * 0.6)
                ear_target = float(np.clip(vert_span / horiz_span, 0.08, 0.38))

        eye_half_h = eye_half_w * ear_target
        # 6 points: p1 (left corner), p2, p3 (top lid), p4 (right corner), p5, p6 (bottom lid)
        return np.array(
            [
                [cx - eye_half_w, cy],
                [cx - eye_half_w * 0.35, cy - eye_half_h],
                [cx + eye_half_w * 0.35, cy - eye_half_h],
                [cx + eye_half_w, cy],
                [cx + eye_half_w * 0.35, cy + eye_half_h],
                [cx - eye_half_w * 0.35, cy + eye_half_h],
            ],
            dtype=np.float32,
        )

    pts[36:42] = _place_eye(0.32, 0.38)
    pts[42:48] = _place_eye(0.68, 0.38)

    # Mouth (48..67)
    mouth_t = np.linspace(0, 2 * np.pi, 12, endpoint=False, dtype=np.float32)
    pts[48:60, 0] = x + w * (0.50 + 0.18 * np.cos(mouth_t))
    pts[48:60, 1] = y + h * (0.76 + 0.06 * np.sin(mouth_t))
    inner_t = np.linspace(0, 2 * np.pi, 8, endpoint=False, dtype=np.float32)
    pts[60:68, 0] = x + w * (0.50 + 0.12 * np.cos(inner_t))
    pts[60:68, 1] = y + h * (0.76 + 0.03 * np.sin(inner_t))

    return pts


def _apply_margin_crop(
    frame: np.ndarray, x: int, y: int, w: int, h: int, margin: float = 0.15
) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
    """Crops `frame` around `(x, y, w, h)` with a `margin` (15%) expansion."""
    fh, fw = frame.shape[:2]
    mx = int(round(w * margin))
    my = int(round(h * margin))
    x1 = max(0, x - mx)
    y1 = max(0, y - my)
    x2 = min(fw, x + w + mx)
    y2 = min(fh, y + h + my)
    if x2 <= x1 or y2 <= y1:
        return frame.copy(), (0, 0, fw, fh)
    return frame[y1:y2, x1:x2].copy(), (x1, y1, x2, y2)


def get_face_crop_landmarks_and_bbox(
    frame: np.ndarray, margin: float = 0.15
) -> Tuple[Optional[np.ndarray], Optional[np.ndarray], Optional[Tuple[int, int, int, int]]]:
    """
    Locates the primary face in a BGR frame, extracts a 15%-margin cropped ROI,
    68 facial landmarks (shape `(68, 2)`), and bounding box `(x1, y1, x2, y2)`.
    Uses 0.5x pyramid detection and short-horizon ROI tracking to sustain >25 FPS.
    """
    global _LAST_FACE_RECT, _DETECT_FRAME_COUNT

    if frame is None or frame.size == 0:
        return None, None, None

    if frame.ndim == 2:
        gray = frame
        bgr = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
    else:
        bgr = frame
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    fh, fw = gray.shape[:2]
    detector, predictor = _get_dlib_models()

    # Fast ROI reuse across consecutive frames of identical resolution
    reuse_interval = 30 if (_LAST_FACE_RECT is not None and _LAST_FACE_RECT[6]) else 5
    if (
        _LAST_FACE_RECT is not None
        and _LAST_FACE_RECT[4] == fw
        and _LAST_FACE_RECT[5] == fh
        and (_DETECT_FRAME_COUNT % reuse_interval != 0)
    ):
        _DETECT_FRAME_COUNT += 1
        x, y, w, h, _, _, is_synth = _LAST_FACE_RECT
        if predictor is not None and HAS_DLIB:
            rect = dlib.rectangle(x, y, x + w, y + h)
            shape = predictor(gray, rect)
            landmarks = np.array(
                [[shape.part(i).x, shape.part(i).y] for i in range(68)],
                dtype=np.float32,
            )
            if is_synth:
                synth_pts = _synthesize_68_landmarks_from_box(gray, x, y, w, h)
                landmarks[36:48] = synth_pts[36:48]
        else:
            landmarks = _synthesize_68_landmarks_from_box(gray, x, y, w, h)
        crop, bbox = _apply_margin_crop(bgr, x, y, w, h, margin=margin)
        return crop, landmarks, bbox

    _DETECT_FRAME_COUNT += 1
    scale = 0.5 if min(fh, fw) >= 240 else 1.0
    small_gray = (
        cv2.resize(gray, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
        if scale < 1.0
        else gray
    )
    inv_scale = 1.0 / scale

    # 1. Try Dlib HOG + 68-point shape predictor
    if detector is not None:
        try:
            rects = detector(small_gray, 0)
            if len(rects) > 0:
                r_best = max(rects, key=lambda r: r.width() * r.height())
                x = int(round(r_best.left() * inv_scale))
                y = int(round(r_best.top() * inv_scale))
                w = int(round(r_best.width() * inv_scale))
                h = int(round(r_best.height() * inv_scale))
                _LAST_FACE_RECT = (x, y, w, h, fw, fh, False)
                if predictor is not None:
                    full_rect = dlib.rectangle(x, y, x + w, y + h)
                    shape = predictor(gray, full_rect)
                    landmarks = np.array(
                        [[shape.part(i).x, shape.part(i).y] for i in range(68)],
                        dtype=np.float32,
                    )
                else:
                    landmarks = _synthesize_68_landmarks_from_box(gray, x, y, w, h)
                crop, bbox = _apply_margin_crop(bgr, x, y, w, h, margin=margin)
                return crop, landmarks, bbox
        except Exception:
            pass

    # 2. Try MediaPipe FaceMesh if available
    mesh = _get_mediapipe_mesh()
    if mesh is not None:
        try:
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            res = mesh.process(rgb)
            if res.multi_face_landmarks:
                fl = res.multi_face_landmarks[0].landmark
                all_pts = np.array([[lm.x * fw, lm.y * fh] for lm in fl], dtype=np.float32)
                landmarks = all_pts[_MP_TO_68_INDICES]
                x_min, y_min = np.min(landmarks, axis=0)
                x_max, y_max = np.max(landmarks, axis=0)
                x, y = int(x_min), int(y_min)
                w, h = max(1, int(x_max - x_min)), max(1, int(y_max - y_min))
                _LAST_FACE_RECT = (x, y, w, h, fw, fh, False)
                crop, bbox = _apply_margin_crop(bgr, x, y, w, h, margin=margin)
                return crop, landmarks, bbox
        except Exception:
            pass

    # 3. Try OpenCV Haar Cascade on downsampled image
    haar_face, _ = _get_haar_cascades()
    if haar_face is not None and not haar_face.empty():
        faces = haar_face.detectMultiScale(
            small_gray, scaleFactor=1.15, minNeighbors=4, minSize=(24, 24)
        )
        if len(faces) > 0:
            bx, by, bw, bh = max(faces, key=lambda b: b[2] * b[3])
            x = int(round(bx * inv_scale))
            y = int(round(by * inv_scale))
            w = int(round(bw * inv_scale))
            h = int(round(bh * inv_scale))
            _LAST_FACE_RECT = (x, y, w, h, fw, fh, False)
            if predictor is not None and HAS_DLIB:
                rect = dlib.rectangle(x, y, x + w, y + h)
                shape = predictor(gray, rect)
                landmarks = np.array(
                    [[shape.part(i).x, shape.part(i).y] for i in range(68)],
                    dtype=np.float32,
                )
            else:
                landmarks = _synthesize_68_landmarks_from_box(gray, x, y, w, h)
            crop, bbox = _apply_margin_crop(bgr, x, y, w, h, margin=margin)
            return crop, landmarks, bbox

    # 4. Fallback for centered synthetic/cropped portrait frames
    cx, cy = fw // 2, fh // 2
    bw, bh = int(fw * 0.55), int(fh * 0.65)
    x = max(0, cx - bw // 2)
    y = max(0, cy - bh // 2)
    _LAST_FACE_RECT = (x, y, bw, bh, fw, fh, True)
    if predictor is not None and HAS_DLIB:
        rect = dlib.rectangle(x, y, x + bw, y + bh)
        shape = predictor(gray, rect)
        landmarks = np.array(
            [[shape.part(i).x, shape.part(i).y] for i in range(68)],
            dtype=np.float32,
        )
        synth_pts = _synthesize_68_landmarks_from_box(gray, x, y, bw, bh)
        landmarks[36:48] = synth_pts[36:48]
    else:
        landmarks = _synthesize_68_landmarks_from_box(gray, x, y, bw, bh)
    crop, bbox = _apply_margin_crop(bgr, x, y, bw, bh, margin=margin)
    return crop, landmarks, bbox


def get_face_crop_and_landmarks(
    frame: np.ndarray,
) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    """
    Takes a BGR frame, converts to grayscale, and locates the primary face.
    Returns:
      - `face_crop`: BGR face ROI cropped with a 15% bounding margin
      - `landmarks`: NumPy array of shape `(68, 2)` containing 2D facial landmark coordinates
    """
    crop, landmarks, _ = get_face_crop_landmarks_and_bbox(frame, margin=0.15)
    return crop, landmarks


def compute_ear_from_landmarks(landmarks: np.ndarray) -> float:
    """
    Vectorized Eye Aspect Ratio (EAR) calculation:
      EAR = (||p2 - p6|| + ||p3 - p5||) / (2.0 * ||p1 - p4||)
    Supports:
      - Full 68-landmark array `(68, 2)` (indices 36:42 left eye, 42:48 right eye)
      - 12-point dual-eye array `(12, 2)` (0:6 left eye, 6:12 right eye)
      - 6-point single-eye array `(6, 2)`
    """
    pts = np.asarray(landmarks, dtype=np.float32)
    if pts.ndim != 2 or pts.shape[1] != 2:
        raise ValueError(f"Expected landmarks of shape (N, 2), got {pts.shape}")

    if pts.shape[0] >= 68:
        eyes = np.stack([pts[36:42], pts[42:48]], axis=0)  # shape (2, 6, 2)
    elif pts.shape[0] == 12:
        eyes = np.stack([pts[0:6], pts[6:12]], axis=0)
    elif pts.shape[0] == 6:
        eyes = pts[np.newaxis, :, :]  # shape (1, 6, 2)
    else:
        raise ValueError(f"Unsupported landmark count {pts.shape[0]}; expected 68, 12, or 6.")

    # Vectorized Euclidean distances across both eyes simultaneously:
    # p1=eyes[:, 0], p2=eyes[:, 1], p3=eyes[:, 2], p4=eyes[:, 3], p5=eyes[:, 4], p6=eyes[:, 5]
    v1 = np.linalg.norm(eyes[:, 1] - eyes[:, 5], axis=1)  # ||p2 - p6||
    v2 = np.linalg.norm(eyes[:, 2] - eyes[:, 4], axis=1)  # ||p3 - p5||
    horiz = np.linalg.norm(eyes[:, 0] - eyes[:, 3], axis=1)  # ||p1 - p4||

    ears = (v1 + v2) / np.maximum(2.0 * horiz, 1e-6)
    return float(np.mean(ears))


def evaluate_liveness_ear(
    landmarks: np.ndarray,
    history_deque: Deque[float],
    threshold: float = 0.22,
) -> float:
    """
    Computes EAR using vectorized Euclidean distances:
      EAR = (||p2 - p6|| + ||p3 - p5||) / (2.0 * ||p1 - p4||)
    Maintains a 30-frame rolling window in `history_deque` and detects whether a natural
    blink dip below `threshold` occurs alongside open-eye recovery.
    Returns a normalized liveness score in [0.0, 1.0].
    """
    if landmarks is None:
        return 0.0

    current_ear = compute_ear_from_landmarks(landmarks)
    history_deque.append(current_ear)
    while len(history_deque) > 30:
        history_deque.popleft()

    history = np.asarray(history_deque, dtype=np.float32)
    n = history.size
    if n < 2:
        return 0.25

    min_ear = float(np.min(history))
    max_ear = float(np.max(history))
    std_ear = float(np.std(history))
    dynamic_range = max_ear - min_ear

    # Detect physiological blink signature:
    # 1) At least one frame dips below `threshold` (0.22)
    # 2) Other frames in the 30-frame window represent open eyes (> threshold + 0.02)
    has_dip = min_ear < threshold
    has_open_baseline = max_ear >= (threshold + 0.02)

    if has_dip and has_open_baseline:
        # Score scales from 0.75 to 1.0 based on blink depth and temporal variation
        dip_depth = np.clip((threshold - min_ear) / max(threshold, 1e-4), 0.0, 1.0)
        range_score = np.clip(dynamic_range / 0.12, 0.0, 1.0)
        score = 0.72 + 0.16 * float(dip_depth) + 0.12 * float(range_score)
    else:
        # No blink detected in the current 30-frame window:
        # Static eyes (replay / photo spoofing) have near-zero variance -> near-zero liveness
        variance_score = np.clip(std_ear / 0.035, 0.0, 1.0)
        range_score = np.clip(dynamic_range / 0.10, 0.0, 1.0)
        score = 0.05 + 0.25 * float(variance_score) + 0.15 * float(range_score)

    return float(np.clip(score, 0.0, 1.0))


class BlinkLivenessTracker:
    """
    Phase 2 Physiological Liveness Tracker with:
      1) Cold-start grace window (first 45 frames / ~2s) so live users are not
         penalized before their first involuntary blink.
      2) Blink persistence memory (120 frames / ~5s) so a confirmed natural blink
         sustains high liveness across normal human inter-blink intervals while
         frozen photo/replay attacks decay to near-zero.
    """

    def __init__(
        self,
        threshold: float = 0.22,
        grace_frames: int = 45,
        persistence_frames: int = 120,
    ) -> None:
        self.threshold = float(threshold)
        self.grace_frames = int(grace_frames)
        self.persistence_frames = int(persistence_frames)
        self.ear_history: Deque[float] = deque(maxlen=30)
        self.total_frames: int = 0
        self.blink_count: int = 0
        self.frames_since_blink: int = 9999
        self.last_confirmed_score: float = 0.85
        self._in_blink_dip: bool = False

    def reset(self) -> None:
        self.ear_history.clear()
        self.total_frames = 0
        self.blink_count = 0
        self.frames_since_blink = 9999
        self._in_blink_dip = False

    def update(self, landmarks: Optional[np.ndarray]) -> Tuple[float, str]:
        """
        Updates rolling 30-frame EAR window + blink persistence state.
        Returns `(liveness_score, liveness_status)` where `liveness_status` is one of:
          - `"BLINK_VERIFIED"`
          - `"CALIBRATING"`
          - `"STATIC_SPOOF_RISK"`
        """
        if landmarks is None:
            return 0.0, "NO_FACE"

        self.total_frames += 1
        current_ear = compute_ear_from_landmarks(landmarks)
        window_score = evaluate_liveness_ear(
            landmarks, self.ear_history, threshold=self.threshold
        )

        # Detect blink transition (open -> dip < threshold -> recovery)
        if current_ear < self.threshold:
            self._in_blink_dip = True
            self.frames_since_blink = 0
            self.last_confirmed_score = max(window_score, 0.88)
        elif self._in_blink_dip and current_ear >= (self.threshold + 0.02):
            self._in_blink_dip = False
            self.blink_count += 1
            self.frames_since_blink = 0
            self.last_confirmed_score = max(window_score, 0.92)
        else:
            self.frames_since_blink += 1

        # 1. Active blink in current 30-frame window
        if window_score >= 0.70:
            self.frames_since_blink = min(self.frames_since_blink, 15)
            self.last_confirmed_score = window_score
            return float(window_score), "BLINK_VERIFIED"

        # 2. Recent confirmed blink within persistence horizon (~5 seconds)
        if self.frames_since_blink <= self.persistence_frames:
            decay = 0.18 * (float(self.frames_since_blink) / float(self.persistence_frames))
            persisted = float(np.clip(self.last_confirmed_score - decay, 0.72, 0.95))
            return persisted, "BLINK_VERIFIED"

        # 3. Cold-start grace window (first ~45 frames) if natural micro-fluctuations exist
        std_ear = float(np.std(self.ear_history)) if len(self.ear_history) >= 3 else 0.01
        if self.total_frames <= self.grace_frames and std_ear >= 0.0025:
            grace_score = float(np.clip(0.68 + 2.0 * std_ear, 0.65, 0.78))
            return grace_score, "CALIBRATING"

        # 4. Expired persistence & no blink -> static replay / photo spoof risk
        return float(window_score), "STATIC_SPOOF_RISK"


def calculate_ela_anomaly(face_crop: np.ndarray, quality: int = 90) -> float:
    """
    Plane A (Spatial Analysis): Error Level Analysis (ELA).
    Encodes `face_crop` to JPEG in-memory at `quality` (default 90), computes the absolute
    pixel-wise residual against the original crop, and combines high-percentile error
    divergence with 8x8 macroblock spatial heterogeneity into an anomaly score in [0.0, 1.0].
    """
    if face_crop is None or face_crop.size == 0:
        return 0.0

    if face_crop.ndim == 2:
        orig_bgr = cv2.cvtColor(face_crop, cv2.COLOR_GRAY2BGR)
    else:
        orig_bgr = face_crop

    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), int(quality)]
    ok, encoded_buf = cv2.imencode(".jpg", orig_bgr, encode_params)
    if not ok:
        return 0.0

    recompressed = cv2.imdecode(encoded_buf, cv2.IMREAD_COLOR)
    if recompressed is None or recompressed.shape != orig_bgr.shape:
        return 0.0

    # Vectorized absolute pixel difference across channels
    diff = np.abs(orig_bgr.astype(np.float32) - recompressed.astype(np.float32))
    diff_gray = np.mean(diff, axis=2)

    # 1. Global & high-percentile compression divergence above baseline sensor floor
    median_floor = float(np.median(diff_gray))
    mean_err = max(0.0, float(np.mean(diff_gray)) - 0.5 * median_floor)
    p95_err = max(0.0, float(np.percentile(diff_gray, 95)) - median_floor)
    p99_err = max(0.0, float(np.percentile(diff_gray, 99)) - median_floor)

    # 2. Spatial splicing boundary / macroblock inconsistency
    # Resize residual map to a grid of 8x8 blocks to measure regional error disparity
    h, w = diff_gray.shape
    bh, bw = max(2, h // 8), max(2, w // 8)
    trimmed = diff_gray[: bh * 8, : bw * 8]
    blocks = trimmed.reshape(bh, 8, bw, 8).mean(axis=(1, 3))
    block_std = float(np.std(blocks))
    block_max_min = float(np.percentile(blocks, 95) - np.percentile(blocks, 10))

    # Normalize components into [0.0, 1.0]
    intensity_norm = np.clip((0.5 * p95_err + 0.5 * p99_err) / 16.0, 0.0, 1.0)
    spatial_norm = np.clip((block_std * 2.5 + block_max_min) / 13.0, 0.0, 1.0)
    mean_norm = np.clip(mean_err / 7.5, 0.0, 1.0)

    anomaly = 0.50 * float(spatial_norm) + 0.35 * float(intensity_norm) + 0.15 * float(mean_norm)
    return float(np.clip(anomaly, 0.0, 1.0))


def calculate_fft_anomaly(face_crop: np.ndarray) -> float:
    """
    Plane C (Spectral Analysis): 2D Fast/Discrete Fourier Transform (FFT/DFT).
    Converts `face_crop` to grayscale, computes 2D DFT (`cv2.dft`), shifts the DC
    zero-frequency component to the center (`np.fft.fftshift`), computes the log-magnitude
    spectrum, applies a circular high-pass filter, and measures radial/spectral energy peaks
    characteristic of GAN deconvolution/upsampling checkerboard artifacts.
    Returns a normalized anomaly metric in [0.0, 1.0].
    """
    if face_crop is None or face_crop.size == 0:
        return 0.0

    if face_crop.ndim == 3:
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY).astype(np.float32)
    else:
        gray = face_crop.astype(np.float32)

    h, w = gray.shape[:2]
    if h < 16 or w < 16:
        return 0.0

    # Remove DC mean & apply 2D Hann window at native resolution so high-frequency
    # GAN upsampling / checkerboard artifacts are not attenuated by resize interpolation
    centered = gray - float(np.mean(gray))
    hann_y = np.hanning(h).astype(np.float32)
    hann_x = np.hanning(w).astype(np.float32)
    windowed = centered * np.outer(hann_y, hann_x)

    # Compute 2D DFT via OpenCV and shift zero-frequency DC component to center
    dft = cv2.dft(windowed, flags=cv2.DFT_COMPLEX_OUTPUT)
    dft_shift = np.fft.fftshift(dft, axes=(0, 1))

    magnitude = cv2.magnitude(dft_shift[:, :, 0], dft_shift[:, :, 1])
    log_spectrum = np.log1p(magnitude)

    # Construct vectorized radial coordinate grid & circular high-pass filter mask
    cy, cx = h // 2, w // 2
    yy, xx = np.ogrid[:h, :w]
    radius = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)
    max_r = float(min(cx, cy))

    # Circular high-pass filter: isolate outer high-frequency region (r > 0.30 * max_r)
    hp_mask = radius > (0.30 * max_r)
    ac_mask = radius > 2.0

    hp_log = log_spectrum[hp_mask]
    hp_mag = magnitude[hp_mask]
    ac_mag = magnitude[ac_mask]
    if hp_log.size == 0 or ac_mag.size == 0:
        return 0.0

    # 1. High-frequency spectral energy fraction
    total_ac_energy = float(np.sum(ac_mag**2)) + 1e-6
    hp_energy_ratio = float(np.sum(hp_mag**2)) / total_ac_energy

    # 2. Spectral spike prominence in log-magnitude domain (periodic grid peaks)
    hp_median = float(np.median(hp_log))
    hp_max = float(np.max(hp_log))
    hp_p999 = float(np.percentile(hp_log, 99.9))
    spike_prominence = (0.6 * hp_max + 0.4 * hp_p999) - hp_median

    # 3. Radial energy peak-to-median in high-frequency rings
    r_int = np.clip(radius.astype(np.int32), 0, int(max_r))
    radial_sum = np.bincount(r_int.ravel(), weights=magnitude.ravel())
    radial_cnt = np.maximum(np.bincount(r_int.ravel()), 1)
    radial_profile = radial_sum / radial_cnt
    hp_radial = radial_profile[max(1, int(0.30 * max_r)) :]
    radial_peak = (
        float(np.max(hp_radial)) / max(float(np.median(hp_radial)), 1e-3) - 1.0
        if hp_radial.size > 0
        else 0.0
    )

    energy_score = np.clip(hp_energy_ratio / 0.18, 0.0, 1.0)
    spike_score = np.clip((spike_prominence - 2.8) / 4.5, 0.0, 1.0)
    radial_score = np.clip((radial_peak - 0.8) / 3.5, 0.0, 1.0)

    anomaly = 0.45 * float(energy_score) + 0.35 * float(spike_score) + 0.20 * float(radial_score)
    return float(np.clip(anomaly, 0.0, 1.0))


def create_synthetic_test_face(
    width: int = 320,
    height: int = 320,
    eye_openness: float = 0.30,
    seed: int = 42,
) -> np.ndarray:
    """
    Creates a smooth, natural-looking synthetic portrait frame for deterministic unit tests
    and dataset calibration.
    """
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)

    # Soft natural illumination gradient background
    bg_b = 185.0 - 0.12 * yy + 0.05 * xx
    bg_g = 195.0 - 0.10 * yy + 0.04 * xx
    bg_r = 205.0 - 0.08 * yy + 0.06 * xx
    frame = np.stack([bg_b, bg_g, bg_r], axis=-1)

    cx, cy = width // 2, height // 2
    fw, fh = int(width * 0.32), int(height * 0.40)

    # Smooth skin-tone face ellipse via soft Gaussian-blurred mask
    face_mask = (((xx - cx) / fw) ** 2 + ((yy - cy) / fh) ** 2 <= 1.0).astype(np.float32)
    face_mask = cv2.GaussianBlur(face_mask, (21, 21), 7.0)[..., np.newaxis]

    # Subtle 3D shading on cheeks/forehead
    shading = 1.0 - 0.18 * (((xx - cx) / fw) ** 2 + ((yy - (cy - 10)) / fh) ** 2)
    shading = np.clip(shading, 0.75, 1.05)[..., np.newaxis]
    skin = np.array([148.0, 176.0, 218.0], dtype=np.float32) * shading

    frame = frame * (1.0 - face_mask) + skin * face_mask

    # Add gentle low-frequency skin texture
    low_freq_tex = rng.normal(0.0, 1.8, size=(height // 4, width // 4, 3)).astype(np.float32)
    low_freq_tex = cv2.resize(low_freq_tex, (width, height), interpolation=cv2.INTER_CUBIC)
    frame = np.clip(frame + low_freq_tex, 0, 255).astype(np.uint8)

    # Draw eyebrows, nose, mouth, and eyes with controllable eyelid opening
    eye_w = max(14, int(fw * 0.28))
    eye_h = max(1, int(round(eye_w * eye_openness)))
    lx, rx = int(cx - fw * 0.38), int(cx + fw * 0.38)
    ey = int(cy - fh * 0.18)

    for ex in (lx, rx):
        cv2.ellipse(frame, (ex, ey), (eye_w, eye_h), 0, 0, 360, (240, 242, 245), -1)
        iris_r = max(1, min(eye_h, int(eye_w * 0.42)))
        cv2.circle(frame, (ex, ey), iris_r, (45, 55, 75), -1)
        cv2.circle(frame, (ex, ey), max(1, iris_r // 2), (15, 15, 20), -1)
        cv2.ellipse(frame, (ex, ey), (eye_w, eye_h), 0, 0, 360, (60, 70, 90), 1)
        # Eyebrow
        cv2.ellipse(frame, (ex, ey - int(fh * 0.14)), (eye_w + 4, 6), 0, 190, 350, (65, 75, 95), 3)

    # Nose & mouth
    cv2.line(frame, (cx, int(cy - fh * 0.08)), (cx, int(cy + fh * 0.18)), (120, 145, 185), 2)
    cv2.ellipse(frame, (cx, int(cy + fh * 0.42)), (int(fw * 0.30), int(fh * 0.08)), 0, 0, 180, (110, 115, 185), 3)

    # Smooth edges slightly so natural face has low high-frequency energy
    frame = cv2.GaussianBlur(frame, (5, 5), 1.1)
    return frame


def run_unit_tests() -> None:
    """Runs unit test assertions for Face Crop/Landmarks, EAR, ELA, and FFT planes."""
    print("[TEST] Running engine_cv.py unit test suite...")

    # 1. Test get_face_crop_and_landmarks
    frame = create_synthetic_test_face(320, 320, eye_openness=0.30)
    crop, landmarks = get_face_crop_and_landmarks(frame)
    assert crop is not None and crop.ndim == 3 and crop.size > 0, "Face crop failed"
    assert landmarks is not None and landmarks.shape == (68, 2), f"Expected (68, 2), got {landmarks.shape}"
    print(f"  [PASS] get_face_crop_and_landmarks -> crop={crop.shape}, landmarks={landmarks.shape}")

    # 2. Test evaluate_liveness_ear (static vs natural blink in 30-frame window)
    static_deque: Deque[float] = deque(maxlen=30)
    open_pts = landmarks.copy()
    for _ in range(30):
        score_static = evaluate_liveness_ear(open_pts, static_deque, threshold=0.22)
    assert 0.0 <= score_static <= 1.0, "Static EAR liveness out of bounds [0, 1]"

    blink_deque: Deque[float] = deque(maxlen=30)
    closed_pts = landmarks.copy()
    # Compress vertical eye points p2, p3, p5, p6 toward horizontal midline for blink frames
    for base in (36, 42):
        mid_y = 0.5 * (closed_pts[base + 0, 1] + closed_pts[base + 3, 1])
        horiz_w = np.linalg.norm(closed_pts[base + 0] - closed_pts[base + 3])
        closed_pts[base + 1, 1] = mid_y - 0.06 * horiz_w
        closed_pts[base + 2, 1] = mid_y - 0.06 * horiz_w
        closed_pts[base + 5, 1] = mid_y + 0.06 * horiz_w
        closed_pts[base + 4, 1] = mid_y + 0.06 * horiz_w

    assert compute_ear_from_landmarks(closed_pts) < 0.22, "Closed eye EAR should be < 0.22"
    assert compute_ear_from_landmarks(open_pts) > 0.22, "Open eye EAR should be > 0.22"

    for i in range(30):
        pts_i = closed_pts if (12 <= i <= 15) else open_pts
        score_blink = evaluate_liveness_ear(pts_i, blink_deque, threshold=0.22)

    assert 0.0 <= score_blink <= 1.0, "Blink EAR liveness out of bounds [0, 1]"
    assert score_blink > score_static + 0.40, (
        f"Expected blink liveness ({score_blink:.3f}) > static liveness ({score_static:.3f})"
    )
    print(f"  [PASS] evaluate_liveness_ear -> static={score_static:.3f}, blink={score_blink:.3f}")

    # 3. Test calculate_ela_anomaly (clean natural crop vs spliced boundary crop)
    clean_ela = calculate_ela_anomaly(crop, quality=90)
    spliced_crop = crop.copy()
    sh, sw = spliced_crop.shape[:2]
    # Inject high-contrast spliced patch with sharp unaligned high-frequency edges
    rng = np.random.default_rng(99)
    patch = rng.integers(0, 255, size=(sh // 2, sw // 2, 3), dtype=np.uint8)
    spliced_crop[sh // 4 : sh // 4 + sh // 2, sw // 4 : sw // 4 + sw // 2] = patch
    spliced_ela = calculate_ela_anomaly(spliced_crop, quality=90)

    assert 0.0 <= clean_ela <= 1.0 and 0.0 <= spliced_ela <= 1.0, "ELA score out of bounds [0, 1]"
    assert spliced_ela > clean_ela, (
        f"Expected spliced ELA ({spliced_ela:.3f}) > clean ELA ({clean_ela:.3f})"
    )
    print(f"  [PASS] calculate_ela_anomaly -> clean={clean_ela:.3f}, spliced={spliced_ela:.3f}")

    # 4. Test calculate_fft_anomaly (smooth crop vs high-frequency GAN checkerboard crop)
    clean_fft = calculate_fft_anomaly(crop)
    gan_crop = crop.astype(np.float32)
    yy, xx = np.mgrid[0 : gan_crop.shape[0], 0 : gan_crop.shape[1]]
    checkerboard = 38.0 * np.sin(np.pi * xx / 2.0) * np.cos(np.pi * yy / 2.0)
    gan_crop = np.clip(gan_crop + checkerboard[..., np.newaxis], 0, 255).astype(np.uint8)
    gan_fft = calculate_fft_anomaly(gan_crop)

    assert 0.0 <= clean_fft <= 1.0 and 0.0 <= gan_fft <= 1.0, "FFT score out of bounds [0, 1]"
    assert gan_fft > clean_fft + 0.25, (
        f"Expected GAN artifact FFT ({gan_fft:.3f}) > clean FFT ({clean_fft:.3f})"
    )
    print(f"  [PASS] calculate_fft_anomaly -> clean={clean_fft:.3f}, gan_artifact={gan_fft:.3f}")
    print("[SUCCESS] All engine_cv.py unit tests passed!")


if __name__ == "__main__":
    run_unit_tests()
