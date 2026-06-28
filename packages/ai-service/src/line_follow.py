import base64
import json
import os
import sys
from datetime import datetime, timezone

import cv2
import numpy as np


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


def analyze_line(image):
    height, width = image.shape[:2]
    roi_top = int(height * float(os.environ.get("BLOCKLYDUINO_LINE_ROI_TOP", "0.55")))
    roi = image[roi_top:height, :]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    moments = cv2.moments(binary)
    min_mass = float(os.environ.get("BLOCKLYDUINO_LINE_MIN_MASS", "500"))
    if moments["m00"] < min_mass:
        return {"label": "perdue", "confidence": 0.0, "offset": 0.0}

    centroid_x = moments["m10"] / moments["m00"]
    center_x = width / 2
    offset = (centroid_x - center_x) / center_x
    deadband = float(os.environ.get("BLOCKLYDUINO_LINE_DEADBAND", "0.12"))

    if abs(offset) < deadband:
        label = "centre"
    elif offset < 0:
        label = "gauche"
    else:
        label = "droite"

    roi_area = width * (height - roi_top)
    confidence = min(1.0, moments["m00"] / max(roi_area * 0.3, 1))

    return {
        "label": label,
        "confidence": round(float(confidence), 4),
        "offset": round(float(offset), 4),
    }


def main():
    request = json.loads(sys.stdin.read() or "{}")
    image = decode_image(request.get("imageDataUrl"))
    result = analyze_line(image)
    print(
        json.dumps(
            {
                "kind": "line",
                **result,
                "at": datetime.now(timezone.utc).isoformat(),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
