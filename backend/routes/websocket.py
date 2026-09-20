import base64
import json

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services.pipeline import get_pipeline


router = APIRouter(tags=["Real-Time Analysis"])


def _decode_frame(payload):
    if not isinstance(payload, dict):
        raise ValueError("Payload must be a JSON object")

    image_data = payload.get("image")
    if not image_data or not isinstance(image_data, str):
        raise ValueError("Missing image field")

    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(image_data)
    except Exception as exc:
        raise ValueError("Invalid Base64 image data") from exc

    if not image_bytes:
        raise ValueError("Empty image data")

    np_array = np.frombuffer(image_bytes, dtype=np.uint8)
    frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

    if frame is None:
        raise ValueError("Failed to decode image")

    return frame


def _json_safe(value):
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, np.ndarray):
        return value.tolist()
    return value


@router.websocket("/ws/detect")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    pipeline = get_pipeline()

    try:
        while True:
            try:
                raw = await websocket.receive_text()
            except WebSocketDisconnect:
                raise
            except Exception as exc:
                await websocket.send_json({
                    "detections": [],
                    "error": f"Invalid WebSocket payload: {exc}",
                })
                continue

            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "detections": [],
                    "error": "Invalid JSON payload",
                })
                continue

            try:
                frame = _decode_frame(payload)
                settings = payload.get("settings", {})
                
                if payload.get("reset_tracker"):
                    pipeline.reset_tracker()
                    
            except ValueError as exc:
                await websocket.send_json({
                    "detections": [],
                    "error": str(exc),
                })
                continue

            try:
                result = pipeline.process_frame(frame, settings=settings)
                print(f"Received settings: {settings}")
                await websocket.send_json(_json_safe(result))
            except Exception as exc:
                print(f"Pipeline error: {type(exc).__name__}: {exc}")
                await websocket.send_json({
                    "detections": [],
                    "error": str(exc),
                })

    except WebSocketDisconnect:
        print("Frontend disconnected.")
    except Exception as exc:
        print(f"WebSocket error: {type(exc).__name__}: {exc}")
