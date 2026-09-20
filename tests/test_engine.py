"""Tests for the maturity engine and the harvest rules.

Run from the project folder:
    python -m pytest tests/test_engine.py -q
"""

import numpy as np
import pytest

from analysis.maturity.engine import predict_maturity, STAGE_NAMES
from analysis.harvest.harvest import predict_harvest, get_crop_info


def solid_color(bgr):
    """A plain colored image, good enough to test the pipeline plumbing."""
    return np.full((64, 64, 3), bgr, dtype=np.uint8)


def test_engine_returns_a_valid_stage_and_score():
    result = predict_maturity(solid_color((50, 50, 210)), "tomato")
    assert result["stage"] in ["Unripe", "Ripe", "Overripe"]
    assert 0 <= result["score"] <= 100


def test_every_stage_has_a_harvest_rule():
    """Whatever the engine says, crops.yaml must know what to do with it."""
    for crop in ["tomato", "mango", "strawberry"]:
        for stage in get_crop_info(crop)["stages"]:
            rule = predict_harvest(crop, stage)
            assert rule["readiness"] in ["low", "medium", "high"]
            assert rule["estimated_time"]


def test_all_model_labels_map_to_real_stages():
    """Including the dataset's misspelled 'Overipe' class."""
    for label in ["Overipe", "Overripe", "Ripe", "Unripe"]:
        assert STAGE_NAMES[label.lower()] in ["Unripe", "Ripe", "Overripe"]


def test_empty_image_is_rejected():
    with pytest.raises(ValueError):
        predict_maturity(np.array([]), "tomato")
