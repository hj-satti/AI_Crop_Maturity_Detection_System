# backend/schemas/detection.py
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

class DetectionItem(BaseModel):
    object_id: Optional[str]
    crop: str
    confidence: float
    bbox: List[int]
    maturity: Optional[Dict[str, Any]] = None
    harvest: Optional[Dict[str, Any]] = None
    temperature: Optional[str] = None

class DetectionResponse(BaseModel):
    detections: List[DetectionItem]