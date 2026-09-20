"""Harvest rules - what to do with a fruit at each ripeness stage.

All the actual knowledge lives in config/crops.yaml, so you can change
the advice (days, readiness) without touching any code.
"""

import yaml

CROPS_FILE = "config/crops.yaml"

_config = None


def get_config():
    """Read crops.yaml the first time we need it, then reuse it."""
    global _config
    if _config is None:
        with open(CROPS_FILE) as f:
            _config = yaml.safe_load(f)
    return _config


def predict_harvest(crop, stage):
    """Given a fruit and its ripeness stage, say when to harvest it."""
    config = get_config()
    if crop not in config:
        raise ValueError(f"Unknown crop '{crop}'")

    rules = config[crop]["harvest_rules"]
    if stage not in rules:
        raise ValueError(f"Unknown stage '{stage}' for {crop}")

    return {
        "readiness": rules[stage]["readiness"],
        "estimated_time": rules[stage]["time"],
    }


def get_crop_info(crop):
    """Return everything crops.yaml knows about a fruit."""
    config = get_config()
    if crop not in config:
        raise ValueError(f"Unknown crop '{crop}'")
    return config[crop]


if __name__ == "__main__":
    # Quick check. Run from the project folder:
    #   python -m analysis.harvest.harvest
    for crop in ["tomato", "mango", "strawberry"]:
        print(crop)
        for stage in get_crop_info(crop)["stages"]:
            rule = predict_harvest(crop, stage)
            print("  ", stage, "->", rule["readiness"], ",", rule["estimated_time"])
