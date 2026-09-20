from cv.detector import FruitDetector
from cv.tracker import SimpleTracker
from analysis.maturity.engine import predict_maturity
from analysis.harvest.harvest import predict_harvest, get_crop_info


_PIPELINE = None


def get_pipeline():
    global _PIPELINE
    if _PIPELINE is None:
        _PIPELINE = DetectionPipeline()
    return _PIPELINE


class DetectionPipeline:
    def __init__(self):
        self.detector = FruitDetector()
        self.tracker = SimpleTracker()

    def reset_tracker(self):
        self.tracker = SimpleTracker()

    def process_frame(self, frame, settings=None):
        if settings is None:
            settings = {}
            
        confidence = float(settings.get("confidence", 0.40))
        resolution = int(settings.get("resolution", 640))
        apply_clahe = bool(settings.get("clahe", False))

        raw_detections = self.detector.detect(
            frame, 
            confidence=confidence, 
            resolution=resolution, 
            apply_clahe=apply_clahe
        )
        tracked_detections = self.tracker.update(raw_detections)
        
        final_detections = []
        for det in tracked_detections:
            x1, y1, x2, y2 = det["bbox"]
            h, w = frame.shape[:2]
            
            roi = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
            
            try:
                # Run Maturity Engine[cite: 3]
                maturity_data = predict_maturity(roi, det["crop"])
                det["maturity"] = maturity_data
                
                # Run Harvest Engine[cite: 4]
                harvest_data = predict_harvest(det["crop"], maturity_data["stage"])
                det["harvest"] = harvest_data

                # Fetch optimal temperature
                crop_info = get_crop_info(det["crop"])
                det["temperature"] = crop_info["optimal_temperature"]
                
            except Exception as e:
                # Handle unsupported crops gracefully[cite: 3, 4]
                print(f"CRASH AVOIDED - Engine Error: {type(e).__name__} - {e}")
                det["maturity"] = {"stage": "unknown", "score": 0}
                det["harvest"] = {"readiness": "unknown", "estimated_time": "unknown"}
                det["temperature"] = "Unknown"
                
                
            final_detections.append(det)
            
        return {"detections": final_detections}