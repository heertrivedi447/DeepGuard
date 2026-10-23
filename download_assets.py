import os
import bz2
import urllib.request
from pathlib import Path

ASSETS_DIR = Path(__file__).resolve().parent / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

DAT_PATH = ASSETS_DIR / "shape_predictor_68_face_landmarks.dat"
BZ2_PATH = ASSETS_DIR / "shape_predictor_68_face_landmarks.dat.bz2"

URLS = [
    "https://github.com/davisking/dlib-models/raw/master/shape_predictor_68_face_landmarks.dat.bz2",
    "http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2",
]

def download_and_extract_landmarks():
    if DAT_PATH.exists() and DAT_PATH.stat().st_size > 90_000_000:
        print(f"[OK] {DAT_PATH} already exists ({DAT_PATH.stat().st_size} bytes).")
        return True

    for url in URLS:
        try:
            print(f"Downloading {url} ...")
            urllib.request.urlretrieve(url, BZ2_PATH)
            print(f"Decompressing {BZ2_PATH} -> {DAT_PATH} ...")
            with bz2.BZ2File(BZ2_PATH, "rb") as src, open(DAT_PATH, "wb") as dst:
                while True:
                    chunk = src.read(1024 * 1024)
                    if not chunk:
                        break
                    dst.write(chunk)
            if BZ2_PATH.exists():
                BZ2_PATH.unlink()
            print(f"[OK] Extracted {DAT_PATH} ({DAT_PATH.stat().st_size} bytes).")
            return True
        except Exception as e:
            print(f"[WARN] Failed from {url}: {e}")

    return False

if __name__ == "__main__":
    download_and_extract_landmarks()
