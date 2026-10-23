# DeepGuard Cyber-Security Frontend

An advanced **Neubrutalist Cyber-Defense Frontend** for the DeepGuard real-time multi-plane deepfake and biometric spoofing detection system. Built with React 19, TypeScript, Tailwind CSS, and Framer Motion.

---

## 🛡️ Architectural Pipeline

Based on the DeepGuard architecture:

```
[ Incoming Webcam Stream (640x480 @ 25 FPS) ]
       │
       ├───► [ Dlib / MediaPipe ] ──► Plane B: EAR Liveness
       │                               ├──► Plane A: ELA Metrics
       │                               └──► Plane C: FFT Spectrum
       │
       └───► [ Pre-Trained Deepfake ViT / SigLIP ] (Frozen inference)
                                       └──► [ Neural Fake Probability ]
                                                    │
       ┌────────────────────────────────────────────┘
       ▼
[ Train ONLY a Lightweight Fusion Classifier ]
(e.g., Logistic Regression / SVM on 4-feature vector: [ELA, EAR, FFT, ViT])
       │
       ▼
[ Final Authenticity Verdict: GENUINE vs. FRAUD ]
```

---

## 🚀 Key Functional Features

1. **Webcam Acquisition Hook (`useWebcam`)**:
   - Accesses local camera using `navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, frameRate: 25 } })`.
   - Includes graceful fallback to a dynamic 640x480 animated synthetic test pattern for headless/non-camera testing environments.
   - Clean track disposal and camera toggles.

2. **Hidden Canvas Frame Dispatcher (`useFrameDispatcher`)**:
   - Hidden HTML5 `<canvas>` element (640x480).
   - Steady 40–50 ms interval (~20–25 FPS) drawing frames and exporting base64 JPEG payloads.
   - Dispatches payloads via WebSocket connection.

3. **Multi-Plane Telemetry Simulation & FastAPI Readiness**:
   - **Plane A (ELA Metrics)**: Error Level Analysis, compression artifact discrepancy, residual noise density.
   - **Plane B (EAR Liveness)**: Dlib / MediaPipe bilateral Eye Aspect Ratio, spontaneous blink cadence (3.8s intervals), micro-saccades, and anti-spoofing confidence.
   - **Plane C (FFT Spectrum)**: 2D Fourier transform radial power, 16-band spectrum visualizer, periodic checkerboard artifact detection.
   - **Neural ViT / SigLIP**: Frozen ViT embedding fake probability, latent cosine distance, attention head hotspot flags.
   - **Lightweight Fusion Classifier**: Hyperplane calculation combining the 4-feature vector with decision cutoff (0.50).

4. **Neubrutalist Dark-Mode UI/UX**:
   - Bold 2px outlines with hard drop shadows (`#0097A7`, `#1E3A8A`, `#EAB308`).
   - Frosted glass components (`backdrop-blur-md bg-[#0E1626]/85`).
   - High-contrast color palette: Deep Indigo (`#1E3A8A`), Vibrant Teal (`#0097A7`), Gold Accent (`#EAB308`), Emerald (`#10B981`), and Crimson Alert (`#EF4444`).
   - **Status Badge**: Prominent verdict banner with steady green glow for "GENUINE" and flashing pulsing red siren for "FRAUD / DEEPFAKE".
   - **Animated HUD Overlay**: Framer Motion sweeping laser scan line, center reticle crosshair, and face bounding box with dynamic landmark coordinates.

5. **Attack Simulation Toolbar & Adversarial Slider**:
   - Presets for: *Genuine User*, *Deepfake Face Swap*, *Replay / Photo Spoof*, *GAN / Diffusion Synthesis*.
   - Manual Adversarial slider ($\epsilon \in [0, 1]$) to visualize classifier threshold crossing in real time.

6. **Modular Backend Switch**:
   - Switch seamlessly between the Internal Mock Socket and a live Python FastAPI WebSocket endpoint (`ws://localhost:8000/ws/stream`).
   - Pre-packaged `fastapi_server.py` provided for instant deployment.

---

## 🛠️ Getting Started

### 1. Run the Frontend
```bash
cd deepguard-frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. (Optional) Run Python FastAPI Backend
```bash
pip install fastapi uvicorn websockets
uvicorn fastapi_server:app --host 0.0.0.0 --port 8000 --reload
```
Click **"Backend"** in the top navigation bar and select **"Switch to FastAPI WebSocket"**.
