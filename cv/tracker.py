import math

class SimpleTracker:
    def __init__(self, max_disappeared=5, max_distance=50):
        self.next_object_id = 0
        self.objects = {}  # {object_id: (centroid_x, centroid_y, disappeared_count)}
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def update(self, detections):
        # detections is a list of dicts: {"crop": str, "confidence": float, "bbox": [x1, y1, x2, y2]}
        if len(detections) == 0:
            for obj_id in list(self.objects.keys()):
                self.objects[obj_id] = (self.objects[obj_id][0], self.objects[obj_id][1], self.objects[obj_id][2] + 1)
                if self.objects[obj_id][2] > self.max_disappeared:
                    del self.objects[obj_id]
            return []

        input_centroids = []
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            cx = int((x1 + x2) / 2.0)
            cy = int((y1 + y2) / 2.0)
            input_centroids.append((cx, cy))

        # This is a simplified assignment for the MVP. 
        # It assigns IDs based on proximity to existing centroids.
        tracked_detections = []
        for i, (cx, cy) in enumerate(input_centroids):
            matched_id = None
            min_dist = float("inf")
            
            for obj_id, (ox, oy, _) in self.objects.items():
                dist = math.hypot(cx - ox, cy - oy)
                if dist < min_dist and dist < self.max_distance:
                    min_dist = dist
                    matched_id = obj_id
            
            if matched_id is None:
                matched_id = f"id_{self.next_object_id}"
                self.next_object_id += 1
                
            self.objects[matched_id] = (cx, cy, 0)
            
            # Merge tracker ID with the detection payload
            det_with_id = detections[i].copy()
            det_with_id["object_id"] = matched_id
            tracked_detections.append(det_with_id)
            
        return tracked_detections