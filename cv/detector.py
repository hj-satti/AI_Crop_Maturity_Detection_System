import sys
import pathlib
import cv2
import torch


# Handle path systems across platforms
sys.modules["pathlib._local"] = pathlib

if sys.platform == "win32":
    pathlib.PosixPath = pathlib.WindowsPath
else:
    pathlib.WindowsPath = pathlib.PosixPath


PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_ROOT / "models" / "detection" / "yolov5s_trained.pt"
YOLOV5_LOCAL = PROJECT_ROOT / "third_party" / "yolov5"
TORCH_HUB_DIR = PROJECT_ROOT / ".torch_hub"

# Operational filter used by this trained YOLOv5s detector.
# README previously mentioned 65%; runtime behavior is 40%.
CONFIDENCE = 0.40


def _load_custom_yolov5(device):
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"YOLOv5s weights not found at {MODEL_PATH}"
        )

    TORCH_HUB_DIR.mkdir(parents=True, exist_ok=True)
    torch.hub.set_dir(str(TORCH_HUB_DIR))

    if YOLOV5_LOCAL.is_dir():
        print(f"Loading YOLOv5 from local repo: {YOLOV5_LOCAL}")
        return torch.hub.load(
            str(YOLOV5_LOCAL),
            "custom",
            path=str(MODEL_PATH),
            source="local",
            device=device,
        )

    print("Loading YOLOv5 architecture from torch.hub (ultralytics/yolov5)")
    return torch.hub.load(
        "ultralytics/yolov5",
        "custom",
        path=str(MODEL_PATH),
        device=device,
        trust_repo=True,
    )


class FruitDetector:

    def __init__(self):
        self.device = (
            "cuda"
            if torch.cuda.is_available()
            else (
                "mps"
                if torch.backends.mps.is_available()
                else "cpu"
            )
        )

        print(f"Running inference on: {self.device.upper()}")
        print(f"Using weights: {MODEL_PATH}")

        self.model = _load_custom_yolov5(self.device)
        self.model.conf = CONFIDENCE

    def detect(self, frame, confidence=0.40, resolution=640, apply_clahe=False):
        self.model.conf = confidence
        
        if apply_clahe and frame.shape[0] >= 8 and frame.shape[1] >= 8:
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            cl = clahe.apply(l)
            limg = cv2.merge((cl,a,b))
            frame = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

        rgb_frame = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2RGB
        )

        results = self.model(
            rgb_frame,
            size=resolution
        )

        detections = []

        for detection in results.xyxy[0]:

            x1, y1, x2, y2, confidence, class_id = detection.tolist()

            class_id = int(class_id)

            detections.append({
                "crop": self.model.names[class_id],
                "confidence": round(confidence, 2),
                "bbox": [
                    int(x1),
                    int(y1),
                    int(x2),
                    int(y2)
                ]
            })

        return detections
