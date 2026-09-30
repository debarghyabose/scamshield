"""
ML Model Service.
Loads scikit-learn TF-IDF + LogisticRegression model (spam_model.pkl)
to predict spam/scam text probability and classification.
"""

from __future__ import annotations

import os
import pickle
import logging
from pathlib import Path
from typing import Any

log = logging.getLogger("scamshield.ml")

MODEL_PATH = Path(__file__).resolve().parents[1] / "ml_model" / "spam_model.pkl"

_model: Any | None = None
_model_loaded: bool = False


def _get_model():
    global _model, _model_loaded
    if not _model_loaded:
        _model_loaded = True
        if MODEL_PATH.exists():
            try:
                with open(MODEL_PATH, "rb") as f:
                    _model = pickle.load(f)
                log.info("Successfully loaded ML model from %s", MODEL_PATH)
            except Exception as exc:
                log.warning("Failed to load ML model (%s): %s", type(exc).__name__, exc)
                _model = None
        else:
            log.warning("ML model file not found at %s", MODEL_PATH)
    return _model


def predict_message_scam(text: str) -> dict[str, Any]:
    """
    Evaluates message text using the trained ML model.
    Returns prediction ('spam' / 'ham'), is_spam boolean, and confidence score.
    """
    model = _get_model()
    if model is None:
        return {"is_spam": False, "confidence": 0.0, "prediction": "unknown", "ml_active": False}

    try:
        prediction = model.predict([text])[0]
        confidence = 0.85
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba([text])[0]
            classes = list(getattr(model, "classes_", ["ham", "spam"]))
            if "spam" in classes:
                spam_idx = classes.index("spam")
                confidence = float(probs[spam_idx])
            else:
                confidence = float(max(probs))

        is_spam = str(prediction).lower() == "spam"
        return {
            "is_spam": is_spam,
            "confidence": round(confidence, 4),
            "prediction": str(prediction),
            "ml_active": True,
        }
    except Exception as exc:
        log.warning("ML prediction failed: %s", exc)
        return {"is_spam": False, "confidence": 0.0, "prediction": "error", "ml_active": False}
