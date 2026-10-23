"""
DeepGuard - Step 1 Environment & Asset Verification Script (verify_env.py)
Asserts that OpenCV, PyTorch, Transformers, scikit-learn, dlib, and 68-point facial
landmark extraction work properly.
"""

from pathlib import Path
import cv2
import numpy as np
import scipy
import sklearn
import torch
import torchvision
import transformers
import PIL
import imutils
import dlib

from engine_cv import (
    DLIB_LANDMARK_PATH,
    create_synthetic_test_face,
    get_face_crop_and_landmarks,
)


def verify_environment() -> None:
    print("=== DeepGuard Environment Verification ===")
    print(f"OpenCV version       : {cv2.__version__}")
    print(f"NumPy version        : {np.__version__}")
    print(f"SciPy version        : {scipy.__version__}")
    print(f"scikit-learn version : {sklearn.__version__}")
    print(f"PyTorch version      : {torch.__version__} (CUDA available: {torch.cuda.is_available()})")
    print(f"Torchvision version  : {torchvision.__version__}")
    print(f"Transformers version : {transformers.__version__}")
    print(f"Pillow version       : {PIL.__version__}")
    print(f"dlib version         : {getattr(dlib, '__version__', 'installed')}")

    assert DLIB_LANDMARK_PATH.exists(), f"Missing landmark file: {DLIB_LANDMARK_PATH}"
    size_mb = DLIB_LANDMARK_PATH.stat().st_size / (1024 * 1024)
    print(f"Landmark weights     : {DLIB_LANDMARK_PATH} ({size_mb:.1f} MB)")
    assert size_mb > 90.0, "shape_predictor_68_face_landmarks.dat appears incomplete"

    # Verify dlib predictor loads and extracts 68 points
    predictor = dlib.shape_predictor(str(DLIB_LANDMARK_PATH))
    frame = create_synthetic_test_face(320, 320, eye_openness=0.30)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    rect = dlib.rectangle(60, 50, 260, 270)
    shape = predictor(gray, rect)
    assert shape.num_parts == 68, f"Expected 68 landmarks, got {shape.num_parts}"

    crop, landmarks = get_face_crop_and_landmarks(frame)
    assert crop is not None and crop.size > 0, "Failed to extract face crop"
    assert landmarks is not None and landmarks.shape == (68, 2), "Failed to extract (68, 2) landmarks"

    # Verify PyTorch tensor ops
    tensor_test = torch.randn(2, 3, 64, 64)
    assert tensor_test.shape == (2, 3, 64, 64)

    print("[SUCCESS] Environment setup & 68-point landmark extraction verified!")


if __name__ == "__main__":
    verify_environment()
