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
        return "visage detecte"
    if kind == "gender" and label == "person":
        return "personne detectee"
    return label.replace("_", " ")


def detect_face(image):
    cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    classifier = cv2.CascadeClassifier(cascade_path)
    if classifier.empty():
        raise RuntimeError("Classifieur visage OpenCV indisponible.")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = classifier.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
    if len(faces) == 0:
        return {
            "kind": "face",
            "label": "aucun visage",
            "confidence": 0.0,
            "at": datetime.now(timezone.utc).isoformat(),
        }

    image_area = max(1, image.shape[0] * image.shape[1])
    largest = max(faces, key=lambda face: int(face[2]) * int(face[3]))
    x, y, w, h = [int(value) for value in largest]
    image_height, image_width = image.shape[:2]
    confidence = min(0.99, max(0.55, (int(largest[2]) * int(largest[3]) / image_area) * 8))
    return {
        "kind": "face",
        "label": "visage detecte",
        "confidence": round(float(confidence), 4),
        "box": {
            "x": round(x / image_width, 4),
            "y": round(y / image_height, 4),
            "width": round(w / image_width, 4),
            "height": round(h / image_height, 4),
            "label": "visage detecte",
            "confidence": round(float(confidence), 4),
        },
        "at": datetime.now(timezone.utc).isoformat(),
    }


def main():
    request = json.loads(sys.stdin.read() or "{}")
    kind = request.get("kind", "object")
    image = decode_image(request.get("imageDataUrl"))

    if kind == "face":
        print(json.dumps(detect_face(image), ensure_ascii=False))
        return

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
            x1, y1, x2, y2 = [float(value) for value in box.xyxy[0]]
            image_height, image_width = image.shape[:2]
            normalized_label = normalize_label(kind, label)
            detections.append(
                {
                    "label": normalized_label,
                    "confidence": confidence,
                    "box": {
                        "x": round(max(0.0, x1 / image_width), 4),
                        "y": round(max(0.0, y1 / image_height), 4),
                        "width": round(min(1.0, (x2 - x1) / image_width), 4),
                        "height": round(min(1.0, (y2 - y1) / image_height), 4),
                        "label": normalized_label,
                        "confidence": round(float(confidence), 4),
                    },
                }
            )

    if not detections:
        label = "aucun objet" if kind == "object" else "aucune personne"
        confidence = 0.0
    else:
        best = max(detections, key=lambda item: item["confidence"])
        label = best["label"]
        confidence = round(float(best["confidence"]), 4)
        box = best.get("box")

    response = {
        "kind": kind,
        "label": label,
        "confidence": confidence,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    if detections:
        response["box"] = box
    print(json.dumps(response, ensure_ascii=False))


if __name__ == "__main__":
    main()
