"""
DeepGuard - Step 5: Ensemble Fusion & Model Training (train_fusion.py)
Trains Logistic Regression and Linear SVM classifiers on the 4D multi-plane feature vectors:
  [liveness_score, ela_anomaly, fft_anomaly, neural_fake_prob]
Evaluates and logs Precision, Recall, and ROC-AUC, saves the best-performing ensemble
calibrator to `assets/fusion_model.joblib`, and provides the fallback heuristic weighted
formula when the classifier file is missing:
  Authenticity = (0.40 * liveness) + 0.30 * (1 - ela_anomaly) + 0.30 * (1 - fft_anomaly)
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Dict, Optional, Tuple

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC

from dataset_generator import FEATURES_CSV_PATH, generate_calibration_dataset

PROJECT_ROOT = Path(__file__).resolve().parent
ASSETS_DIR = PROJECT_ROOT / "assets"
FUSION_MODEL_PATH = ASSETS_DIR / "fusion_model.joblib"
METRICS_JSON_PATH = ASSETS_DIR / "fusion_metrics.json"

_CACHED_MODEL = None


def fallback_heuristic_authenticity(
    liveness: float,
    ela_anomaly: float,
    fft_anomaly: float,
) -> float:
    """
    Fallback heuristic weighted formula defined in DeepGuard architecture:
      Authenticity = (0.40 * liveness) + 0.30 * (1 - ela_anomaly) + 0.30 * (1 - fft_anomaly)
    Returns an authenticity score in [0.0, 1.0].
    """
    score = (
        (0.40 * float(liveness))
        + (0.30 * (1.0 - float(ela_anomaly)))
        + (0.30 * (1.0 - float(fft_anomaly)))
    )
    return float(np.clip(score, 0.0, 1.0))


def load_dataset(csv_path: Path = FEATURES_CSV_PATH) -> Tuple[np.ndarray, np.ndarray]:
    """Loads 4D feature matrix X and binary label vector y (1=Positive/Genuine, 0=Negative/Spoof)."""
    if not csv_path.exists():
        generate_calibration_dataset()

    features = []
    labels = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            vec = [
                float(row["ela_anomaly"]),
                1.0 - float(row["liveness_score"]),
                float(row["fft_anomaly"]),
                float(row["neural_fake_prob"]),
            ]
            lbl = 1 if row["label"].strip().lower() == "positive" else 0
            features.append(vec)
            labels.append(lbl)

    X = np.asarray(features, dtype=np.float32)
    y = np.asarray(labels, dtype=np.int32)
    return X, y


def train_and_evaluate_fusion() -> Dict[str, Dict[str, float]]:
    """
    Trains Logistic Regression and Linear SVM models on the 4D feature vectors,
    logs Precision, Recall, and ROC-AUC, and saves the best calibrator to
    `assets/fusion_model.joblib`.
    """
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    X, y = load_dataset()

    # Add tiny realistic sensor jitter to evaluate generalization fairly
    rng = np.random.default_rng(42)
    X_eval = np.clip(X + rng.normal(0.0, 0.025, size=X.shape), 0.0, 1.0)

    X_train, X_test, y_train, y_test = train_test_split(
        X_eval, y, test_size=0.30, stratify=y, random_state=42
    )

    models = {
        "LogisticRegression": Pipeline(
            [
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(C=1.0, random_state=42, max_iter=500)),
            ]
        ),
        "LinearSVM": Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "clf",
                    CalibratedClassifierCV(
                        estimator=LinearSVC(C=1.0, random_state=42, dual="auto"),
                        cv=3,
                    ),
                ),
            ]
        ),
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results: Dict[str, Dict[str, float]] = {}
    best_name = ""
    best_auc = -1.0
    best_pipeline = None

    print("=== DeepGuard Ensemble Fusion Model Training ===")
    print(f"Dataset shape: X={X.shape}, Positive={int(np.sum(y == 1))}, Negative={int(np.sum(y == 0))}")

    for name, pipeline in models.items():
        # Fit on train split & evaluate on holdout test split + 5-fold cross-validation
        pipeline.fit(X_train, y_train)
        y_pred_test = pipeline.predict(X_test)
        y_prob_test = pipeline.predict_proba(X_test)[:, 1]

        # 5-fold out-of-fold predictions across all 100 samples
        oof_probs = cross_val_predict(pipeline, X_eval, y, cv=cv, method="predict_proba")[:, 1]
        oof_preds = (oof_probs >= 0.5).astype(np.int32)

        precision = float(precision_score(y, oof_preds, zero_division=0))
        recall = float(recall_score(y, oof_preds, zero_division=0))
        roc_auc = float(roc_auc_score(y, oof_probs))
        accuracy = float(accuracy_score(y, oof_preds))
        test_auc = float(roc_auc_score(y_test, y_prob_test))

        results[name] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "roc_auc": round(roc_auc, 4),
            "accuracy": round(accuracy, 4),
            "holdout_roc_auc": round(test_auc, 4),
        }

        print(
            f"  [{name:18s}] Precision={precision:.4f} | Recall={recall:.4f} | "
            f"ROC-AUC={roc_auc:.4f} | Accuracy={accuracy:.4f}"
        )

        if roc_auc >= best_auc:
            best_auc = roc_auc
            best_name = name
            best_pipeline = pipeline

    assert best_pipeline is not None
    # Fit best pipeline on full calibration dataset before saving
    best_pipeline.fit(X, y)
    joblib.dump(best_pipeline, FUSION_MODEL_PATH)

    summary = {
        "best_model": best_name,
        "model_path": str(FUSION_MODEL_PATH),
        "metrics": results,
    }
    with open(METRICS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"[FusionTrainer] Saved best ensemble calibrator ({best_name}) -> {FUSION_MODEL_PATH}")
    return results


def predict_authenticity(
    liveness_score: float,
    ela_anomaly: float,
    fft_anomaly: float,
    neural_fake_prob: float,
    model_path: Path = FUSION_MODEL_PATH,
) -> Tuple[bool, float]:
    """
    Computes the final authenticity decision `(is_genuine, authenticity_score)` from
    the 4D feature vector `[liveness_score, ela_anomaly, fft_anomaly, neural_fake_prob]`.
    Uses `assets/fusion_model.joblib` when present; otherwise falls back to the heuristic
    weighted formula:
      Authenticity = (0.40 * liveness) + 0.30 * (1 - ela_anomaly) + 0.30 * (1 - fft_anomaly)
    """
    global _CACHED_MODEL

    if model_path.exists():
        try:
            if _CACHED_MODEL is None:
                _CACHED_MODEL = joblib.load(model_path)
            X = np.array(
                [[ela_anomaly, 1.0 - liveness_score, fft_anomaly, neural_fake_prob]],
                dtype=np.float32,
            )
            prob_genuine = float(_CACHED_MODEL.predict_proba(X)[0, 1])
            # Blend classifier probability with heuristic floor for smooth telemetry metering
            heur_score = fallback_heuristic_authenticity(liveness_score, ela_anomaly, fft_anomaly)
            auth_score = float(np.clip(0.75 * prob_genuine + 0.25 * heur_score, 0.0, 1.0))
            return (auth_score >= 0.50), auth_score
        except Exception:
            pass

    auth_score = fallback_heuristic_authenticity(liveness_score, ela_anomaly, fft_anomaly)
    return (auth_score >= 0.50), auth_score


if __name__ == "__main__":
    train_and_evaluate_fusion()
    # Verify both trained model prediction and fallback heuristic formula
    is_gen, score_gen = predict_authenticity(0.90, 0.12, 0.08, 0.15)
    is_fraud, score_fraud = predict_authenticity(0.05, 0.85, 0.88, 0.82)
    heur_gen = fallback_heuristic_authenticity(0.90, 0.12, 0.08)
    heur_fraud = fallback_heuristic_authenticity(0.05, 0.85, 0.88)
    assert is_gen and not is_fraud, "Fusion model sanity check failed"
    assert heur_gen > 0.75 and heur_fraud < 0.25, "Heuristic formula sanity check failed"
    print(
        f"[Verify] Genuine score={score_gen:.3f} (heuristic={heur_gen:.3f}) | "
        f"Fraud score={score_fraud:.3f} (heuristic={heur_fraud:.3f})"
    )
    print("[SUCCESS] train_fusion.py verified!")
