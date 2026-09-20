"""Maturity engine - tells how ripe a fruit is.

The YOLO detector finds fruits in the camera frame. For every fruit it
finds, this engine looks at the fruit image and answers one question:
is it Unripe, Ripe or Overripe?

The model is a small MobileNetV2 network trained in Google Colab on the
Kaggle "Fruits Ripeness Classification" dataset (apple, banana, mango,
orange, tomato). See notebooks/Train_Maturity_Model.ipynb to retrain it.
"""

import json

import cv2
import numpy as np
from tensorflow.keras.models import load_model

IMG_SIZE = 224  # image size the model was trained on, don't change

# The Kaggle dataset has one folder misspelled as "Overipe", so the model
# actually has 4 outputs. This maps every possible output back to the
# three stage names used in config/crops.yaml.
STAGE_NAMES = {
    "overipe": "Overripe",
    "overripe": "Overripe",
    "ripe": "Ripe",
    "unripe": "Unripe",
}

_model = None
_labels = None


def load_model_once():
    """Load the model and labels the first time we need them, then reuse."""
    global _model, _labels
    if _model is None:
        # These paths work because the backend is always started from the
        # project folder (uvicorn backend.main:app).
        _model = load_model("models/maturity/maturity_model.h5")
        with open("models/maturity/class_labels.json") as f:
            _labels = json.load(f)
    return _model, _labels


def predict_maturity(image, crop):
    """Return how ripe one fruit is.

    image: fruit picture cut out of the frame (BGR, from OpenCV)
    crop:  fruit name like "tomato" - the current model treats all fruits
           the same, but we keep this argument so the pipeline stays simple
    """
    if image is None or image.size == 0:
        raise ValueError("Empty image")

    model, labels = load_model_once()

    # Same preparation as during training: RGB colors, 224x224, values 0-1.
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(rgb, (IMG_SIZE, IMG_SIZE))
    batch = np.expand_dims(resized / 255.0, axis=0)

    predictions = model.predict(batch, verbose=0)[0]
    best = predictions.argmax()

    return {
        "stage": STAGE_NAMES.get(labels[best].lower(), labels[best]),
        "score": int(predictions[best] * 100),
    }


if __name__ == "__main__":
    # Quick check. Run from the project folder:
    #   python -m analysis.maturity.engine
    green = np.full((100, 100, 3), (60, 180, 60), dtype=np.uint8)
    print("Green image ->", predict_maturity(green, "tomato"))
