import base64
import json
import os
import sys
from datetime import datetime, timezone

import cv2
import numpy as np
from ultralytics import YOLO


def decode_image(data_url):
    if not data_url:
        raise ValueError("Aucune image fournie.")
    payload = data_url.split(",", 1)[1] if "," in data_url else data_url
    raw = base64.b64decode(payload)
    buffer = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Image illisible.")
    return image


def normalize_label(kind, label):
    if kind == "face" and label == "person":
        return "personne detectee"
    if kind == "gender" and label == "person":
        return "personne detectee"
    return label.replace("_", " ")


def main():
    request = json.loads(sys.stdin.read() or "{}")
    kind = request.get("kind", "object")
    image = decode_image(request.get("imageDataUrl"))

    model_path = os.environ.get("BLOCKLYDUINO_YOLO_MODEL", "yolov8n.pt")
    model = YOLO(model_path)
    results = model.predict(image, verbose=False, conf=float(os.environ.get("BLOCKLYDUINO_YOLO_CONF", "0.25")))

    detections = []
    for result in results:
        names = result.names
        for box in result.boxes:
            class_id = int(box.cls[0])
            label = str(names.get(class_id, class_id))
            confidence = float(box.conf[0])
            detections.append(
                {
                    "label": normalize_label(kind, label),
                    "confidence": confidence,
                }
            )

    if not detections:
        label = "aucun objet" if kind == "object" else "aucune personne"
        confidence = 0.0
    else:
        best = max(detections, key=lambda item: item["confidence"])
        label = best["label"]
        confidence = round(float(best["confidence"]), 4)

    print(
        json.dumps(
            {
                "kind": kind,
                "label": label,
                "confidence": confidence,
                "at": datetime.now(timezone.utc).isoformat(),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
