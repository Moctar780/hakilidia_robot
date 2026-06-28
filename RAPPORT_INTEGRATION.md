# Rapport d'intégration — SensaGram ↔ application tierce

Ce document décrit comment connecter **une autre application** (backend Python, pipeline IA/YOLO, dashboard web, robotique, etc.) au téléphone Android exécutant **SensaGram**.

---

## 1. Vue d'ensemble

SensaGram expose **deux canaux** complémentaires :

| Canal | Protocole | Port par défaut | Usage recommandé |
|---|---|---:|---|
| **LAN HTTP** | HTTP (cleartext) | `8090` | Contrôle, lecture ponctuelle, flux caméra MJPEG, debug |
| **Streaming UDP** | UDP + JSON | `8080` + ports dédiés | Capteurs temps réel vers une machine distante |

```
┌─────────────────────┐         Wi-Fi LAN          ┌──────────────────────────┐
│   Téléphone Android │                            │  Application tierce (PC) │
│      SensaGram      │ ─── HTTP :8090 ──────────► │  - contrôle / status     │
│                     │ ─── MJPEG /api/camera.mjpeg│  - vision (OpenCV/YOLO)  │
│                     │ ─── UDP :8080+ ──────────► │  - télémétrie capteurs   │
└─────────────────────┘                            └──────────────────────────┘
```

**Prérequis communs :**
- Téléphone et machine tierce sur le **même réseau local** (Wi-Fi ou partage de connexion).
- Application SensaGram **ouverte** (le serveur HTTP démarre au lancement).
- Pour le streaming UDP : service de streaming **démarré** depuis l'app ou via `POST /api/control`.
- Autorisations Android accordées selon les flux utilisés (caméra, micro, GPS, notifications).

---

## 2. Découverte du téléphone sur le réseau

L'URL du tableau de bord LAN est affichée dans l'app (écran d'accueil pendant le streaming) :

```
http://<IP_LOCALE>:8090/
```

Exemples d'IP selon le contexte :
- Partage de connexion téléphone → PC : souvent `192.168.43.1` (passerelle = téléphone).
- Wi-Fi domestique : `192.168.1.x` ou `192.168.0.x`.

Vérification rapide :

```bash
curl http://192.168.43.1:8090/api/status
```

---

## 3. API HTTP LAN (intégration recommandée)

Base URL : `http://<IP_TELEPHONE>:8090`

### 3.1 Endpoints GET

| Endpoint | Type | Description |
|---|---|---|
| `GET /` | HTML | Dashboard web intégré |
| `GET /api/status` | JSON | État global, ports UDP, liste des endpoints |
| `GET /api/sensors` | JSON | Dernières lectures de tous les capteurs actifs |
| `GET /api/gps` | JSON | Dernière position GPS |
| `GET /api/microphone` | JSON | Dernier niveau audio (RMS / peak) |
| `GET /api/camera.jpg` | JPEG | Snapshot caméra (une image) |
| `GET /api/camera.mjpeg` | MJPEG | Flux vidéo continu (`multipart/x-mixed-replace`) |
| `GET /api/log` | texte | Journal de debug (`sensagram.log`) |

### 3.2 Contrôle — `POST /api/control`

Content-Type : `application/json`

**Corps minimal (démarrer accéléromètre + streaming) :**

```json
{
  "sensors": ["android.sensor.accelerometer"],
  "gps": false,
  "micro": false,
  "camera": true,
  "streaming": "start",
  "cameraIntervalMs": 100,
  "cameraResolution": "LOW"
}
```

**Champs supportés :**

| Champ | Type | Description |
|---|---|---|
| `sensors` | `string[]` | Liste de `stringType` Android (ex. `android.sensor.gyroscope`) |
| `endpoints` | `object` | Alternative : `{"android.sensor.accelerometer": true, "gps": false, ...}` |
| `gps` | `bool` | Active/désactive le GPS |
| `micro` | `bool` | Active/désactive le micro (niveau RMS, pas l'audio brut) |
| `camera` | `bool` | Active/désactive la caméra |
| `streaming` | `bool` \| `"start"` \| `"stop"` | Démarre ou arrête le service de streaming |
| `cameraIntervalMs` | `int` | Intervalle capture (min. 100 ms) |
| `cameraResolution` | `string` | `LOW` (320×240), `MEDIUM` (480×360), `HIGH` (640×480) |

**Réponse :**

```json
{
  "ok": true,
  "status": {
    "streaming": true,
    "localIp": "192.168.43.1",
    "localHttpPort": 8090,
    "dashboardUrl": "http://192.168.43.1:8090/",
    "endpoints": [ ... ]
  }
}
```

Chaque endpoint dans `status.endpoints` contient : `id`, `name`, `category`, `enabled`, `streaming`, `port`, `hasData`, `api`.  
Pour la caméra : `resolution`, `width`, `height`, `intervalMs`.

### 3.3 Exemple Python — client HTTP minimal

```python
import json
import urllib.request

HOST = "192.168.43.1"
BASE = f"http://{HOST}:8090"

def get(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=5) as r:
        return json.loads(r.read())

def post_control(payload: dict):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{BASE}/api/control",
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=5) as r:
        return json.loads(r.read())

# Activer caméra basse latence + streaming
post_control({
    "camera": True,
    "streaming": "start",
    "cameraResolution": "LOW",
    "cameraIntervalMs": 100,
})

status = get("/api/status")
print(status["streaming"], status["dashboardUrl"])
```

Scripts fournis dans le dépôt :
- `integration_test_lan.py` — tests automatisés de l'API HTTP
- `camera_viewer.py` — visualisation MJPEG avec OpenCV

---

## 4. Flux caméra pour vision / IA (YOLO, OpenCV)

### 4.1 Recommandations de résolution

| `cameraResolution` | Taille | Usage |
|---|---|---|
| `LOW` | 320×240 | Temps réel, YOLO léger (`yolov8n`, entrée 320) |
| `MEDIUM` | 480×360 | Bon compromis qualité / latence |
| `HIGH` | 640×480 | Meilleure détection d'objets petits |

### 4.2 Consommation MJPEG (Python + OpenCV)

```bash
python camera_viewer.py --host 192.168.43.1 --interval-ms 100
```

Le script consomme `GET /api/camera.mjpeg`, extrait les JPEG du flux multipart et les décode avec `cv2.imdecode`.  
Chaque frame est utilisable directement comme entrée `numpy.ndarray` BGR pour YOLO :

```python
# Pseudo-code pipeline IA
for jpeg_bytes in mjpeg_frames(host, 8090):
    frame = cv2.imdecode(np.frombuffer(jpeg_bytes, np.uint8), cv2.IMREAD_COLOR)
    results = model.predict(frame, imgsz=320, verbose=False)
```

### 4.3 Latence attendue (ordre de grandeur)

| Configuration | FPS typique | Latence bout-en-bout |
|---|---:|---:|
| LOW + 100 ms intervalle | 8–10 | ~150–250 ms |
| MEDIUM + 250 ms | 4 | ~300–500 ms |
| HIGH + 250 ms | 4 | ~400–600 ms |

> Pour du vrai temps réel (>15 FPS), une évolution future vers `ImageAnalysis` CameraX est prévue côté Android.

---

## 5. Streaming UDP (télémétrie capteurs)

### 5.1 Configuration côté téléphone

Dans **Réglages** de l'app :
- **Remote Address** : IP de la machine qui reçoit les données.
- **Base Sensor Port** : port de base (défaut `8080`).
- **General Control Port** : port commandes UDP (défaut `8081`).

Chaque capteur, le GPS, le micro et la caméra reçoivent un **port UDP distinct**, alloué dynamiquement à partir du port de base. La cartographie exacte est visible dans `GET /api/status` → `ports`.

### 5.2 Format des messages capteurs

```json
{
  "type": "android.sensor.accelerometer",
  "timestamp": 3925657519043709,
  "values": [0.31892395, -0.97802734, 10.049896]
}
```

`timestamp` : nanosecondes (`SensorEvent.timestamp` Android).

### 5.3 GPS

```json
{
  "type": "android.gps",
  "timestamp": 3925657519043709,
  "latitude": 48.8566,
  "longitude": 2.3522,
  "altitude": 35.0,
  "bearing": 90.0,
  "accuracy": 5.0,
  "speed": 1.2,
  "time": 1719512345678
}
```

### 5.4 Microphone (niveau uniquement)

```json
{
  "type": "android.microphone.level",
  "timestamp": 3925657519043709,
  "rms": 0.12,
  "peak": 0.43
}
```

### 5.5 Caméra UDP (Base64 chunké)

```json
{
  "type": "android.camera.jpeg",
  "timestamp": 3925657519043709,
  "frameId": "c9eacb4b-7a9c-4ff7-b137-0a3f9c2b64aa",
  "encoding": "base64",
  "chunkIndex": 0,
  "totalChunks": 4,
  "data": "/9j/4AAQSkZJRgABAQ..."
}
```

Reassembler les chunks par `frameId`, triés par `chunkIndex`.  
**Recommandation :** pour la vision/IA, préférer le flux HTTP MJPEG (plus simple, moins de CPU).

### 5.6 Commandes UDP distantes (port commande)

Envoyer un datagramme JSON vers `<IP_TELEPHONE>:8081` :

```json
{"command": "start"}
{"command": "stop"}
{"command": "set", "gps": true, "camera": true}
{"command": "select_sensors", "sensors": ["android.sensor.accelerometer"]}
{"command": "configure", "cameraIntervalMs": 100, "cameraResolution": "LOW"}
```

> `cameraResolution` via UDP nécessite le champ dans la commande `configure` (si supporté par la version installée).

### 5.7 Serveur UDP Python minimal

```python
import json
import socket

def on_data(data: bytes):
    msg = json.loads(data)
    print(msg["type"], msg.get("values") or msg.get("latitude"))

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(("0.0.0.0", 8080))
while True:
    data, addr = sock.recvfrom(65535)
    on_data(data)
```

Voir aussi `server.py` et `udp_server.py` dans le dépôt.

---

## 6. Scénarios d'intégration types

### 6.1 Application web / dashboard

- Charger `GET /api/status` toutes les 1 s pour l'état.
- Afficher la caméra via `<img src="http://IP:8090/api/camera.mjpeg">`.
- Piloter les capteurs via `fetch("POST /api/control", ...)`.

### 6.2 Pipeline IA embarqué (PC + GPU)

1. `POST /api/control` → caméra `LOW`, streaming `start`.
2. Lire `/api/camera.mjpeg` en continu.
3. Passer chaque frame à YOLO / ONNX / TensorRT.
4. Optionnel : fusionner avec `GET /api/sensors` (IMU) pour stabilisation ou fusion sensorielle.

### 6.3 Robotique / télémétrie temps réel

1. Configurer l'IP distante dans SensaGram.
2. Écouter les ports UDP alloués (visibles dans `/api/status`).
3. Envoyer commandes sur le port de contrôle UDP `8081`.

### 6.4 Monitoring et debug

- `GET /api/log` : journal persistant (`Android/data/.../files/logs/sensagram.log`).
- Utile pour diagnostiquer permissions, crashes serveur HTTP, erreurs caméra.

---

## 7. Procédure de validation

### 7.1 Test automatisé HTTP

```bash
python3 integration_test_lan.py --host <IP_TELEPHONE> --start-streaming --wait-data 15
```

Résultat attendu : tous les tests `PASS`, streaming `true`, données capteur reçues.

### 7.2 Test caméra

```bash
python3 camera_viewer.py --host <IP_TELEPHONE>
```

Ou ouvrir dans un navigateur : `http://<IP>:8090/api/camera.mjpeg`

### 7.3 Checklist d'intégration

| Étape | Critère de succès |
|---|---|
| Ping réseau | `curl /api/status` → HTTP 200 |
| Contrôle | `POST /api/control` → `"ok": true` |
| Capteurs | `GET /api/sensors` contient les types activés |
| Caméra | MJPEG visible navigateur ou `camera_viewer.py` |
| UDP | Datagrammes JSON reçus sur le port configuré |
| IA | Frame décodée, inférence YOLO < 100 ms (selon GPU) |

---

## 8. Limitations connues

| Sujet | Détail |
|---|---|
| Sécurité | HTTP et UDP en clair sur le LAN — ne pas exposer sur Internet |
| Caméra | Capture par `ImageCapture` en boucle, plafonnée ~10 FPS à 100 ms |
| Micro | Niveau RMS/peak uniquement, pas de flux audio PCM |
| Ports UDP | Réalloués à chaque démarrage de streaming — toujours lire `/api/status` |
| Permissions | Caméra/micro/GPS doivent être accordées manuellement sur le téléphone |
| Réseau | Pare-feu PC peut bloquer UDP entrant (port 8080+) |

---

## 9. Dépannage

| Symptôme | Cause probable | Action |
|---|---|---|
| `Connection refused` sur :8090 | App fermée ou serveur HTTP arrêté | Relancer SensaGram |
| POST `/api/control` échoue puis tout refuse | Crash serveur (versions anciennes) | Mettre à jour l'APK debug récent |
| Caméra 404 sur `/api/camera.jpg` | Caméra non activée ou pas encore de frame | `POST` avec `"camera": true` + attendre 1–2 s |
| UDP sans données | Mauvaise IP distante ou pare-feu | Vérifier IP dans réglages, ouvrir ports |
| Flux saccadé | Intervalle 250 ms par défaut | Passer à `cameraIntervalMs: 100` et `LOW` |
| YOLO peu précis | Résolution trop basse / objets petits | Passer à `MEDIUM` ou `HIGH` |

---

## 10. Références dans le dépôt

| Fichier | Rôle |
|---|---|
| `integration_test_lan.py` | Tests d'intégration HTTP |
| `camera_viewer.py` | Viewer MJPEG OpenCV |
| `server.py` / `udp_server.py` | Réception UDP simple |
| `README.md` | Documentation utilisateur générale |
| `app/.../LocalHttpServer.kt` | Implémentation serveur HTTP |
| `app/.../MediaStreamer.kt` | Capture caméra / micro |
| `app/.../StreamPortConfig.kt` | Allocation des ports UDP |

---

## 11. Synthèse pour l'équipe d'intégration

Pour connecter **une nouvelle application** à SensaGram :

1. **Choisir le canal** : HTTP LAN pour contrôle + vision ; UDP pour télémétrie haute fréquence.
2. **Découvrir l'IP** via l'UI ou `/api/status`.
3. **Activer les flux** via `POST /api/control` ou l'interface Android.
4. **Consommer les données** : JSON (capteurs), MJPEG (caméra), UDP (streaming continu).
5. **Valider** avec `integration_test_lan.py` avant de brancher le pipeline métier (YOLO, robotique, etc.).

**Point d'entrée minimal pour une app tierce :**

```
http://<IP_TELEPHONE>:8090/api/status   → découverte
POST /api/control                        → configuration
GET  /api/camera.mjpeg                   → vision temps réel
GET  /api/sensors                        → fusion capteurs
```
