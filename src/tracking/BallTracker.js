import { ObjectDetector, FilesetResolver } from '@mediapipe/tasks-vision';

export class BallTracker {
  constructor() {
    this.objectDetector = null;
    this.isInitialized = false;
    this.smoothingAlpha = 0.35;
    this.smoothPos = null;
    this.frameCount = 0;
    // Simulation mode — for testing without a physical ball
    this.simMode = false;
    this.simStartTime = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    this.objectDetector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `/models/efficientdet_lite0.tflite`,
        delegate: "CPU" // CPU is more reliable across devices
      },
      runningMode: "VIDEO",
      scoreThreshold: 0.15, // Low — we filter by shape, not label
      maxResults: 20         // Look at many detections to find the roundest
    });

    this.isInitialized = true;
    console.log("[BallTracker] initialized.");
  }

  /** Toggle simulation mode (no physical ball needed) */
  setSimMode(enabled) {
    this.simMode = enabled;
    this.simStartTime = enabled ? performance.now() : null;
    console.log(`[BallTracker] Simulation mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  simulate(timestamp) {
    if (!this.simStartTime) this.simStartTime = timestamp;
    const elapsed = (timestamp - this.simStartTime) / 1000;
    const period = 0.75;
    const phase = (elapsed % period) / period;
    const bounceY = Math.abs(Math.sin(phase * Math.PI));
    const x = 0.35 + 0.1 * Math.sin(elapsed * 0.8);
    const y = 0.55 + bounceY * 0.35;
    return { x, y, width: 0.08, height: 0.08, score: 1.0, label: 'sim:sports ball' };
  }

  /**
   * Score how "ball-like" a detection is.
   * Prioritizes: square aspect ratio (circle), large size, known ball labels.
   */
  _ballScore(det, videoWidth, videoHeight) {
    const box = det.boundingBox;
    const w = box.width;
    const h = box.height;
    if (w <= 0 || h <= 0) return -1;

    const label = (det.categories[0]?.categoryName ?? '').toLowerCase();
    const confidence = det.categories[0]?.score ?? 0;

    // Aspect ratio: 1.0 = perfect square (circle). Penalise rectangles.
    const aspectRatio = Math.min(w, h) / Math.max(w, h); // 0..1

    // Known ball labels in COCO: 'sports ball', 'orange', 'apple' (all round!)
    const BALL_LABELS = ['sports ball', 'ball', 'basketball', 'football',
                         'orange', 'apple', 'clock', 'frisbee'];
    const labelBonus = BALL_LABELS.some(l => label.includes(l)) ? 0.4 : 0;

    // Size: bigger = more likely to be the object of interest
    const sizeScore = Math.min(1, (w * h) / (videoWidth * videoHeight) * 200);

    return aspectRatio * 0.5 + labelBonus + sizeScore * 0.1 + confidence * 0.3;
  }

  processFrame(videoElement, timestamp) {
    // Simulation mode bypasses the ML model entirely
    if (this.simMode) return this.simulate(timestamp);

    if (!this.isInitialized || !this.objectDetector) return null;
    if (!videoElement || videoElement.readyState < 2) return null;
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) return null;

    this.frameCount++;

    try {
      const results = this.objectDetector.detectForVideo(videoElement, timestamp);

      if (!results.detections || results.detections.length === 0) return null;

      // Log all detections every 90 frames so you can see what the model sees
      if (this.frameCount % 90 === 1) {
        const cats = results.detections.map(d =>
          `${d.categories[0]?.categoryName}(${d.categories[0]?.score?.toFixed(2)}) `+
          `${Math.round(d.boundingBox?.width)}x${Math.round(d.boundingBox?.height)}`
        );
        console.log('[BallTracker] all detections:', cats.join(' | '));
      }

      // Pick the most ball-like detection
      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      let best = null;
      let bestScore = 0.1; // Minimum quality — ignore very un-round detections

      for (const det of results.detections) {
        const s = this._ballScore(det, vw, vh);
        if (s > bestScore) {
          bestScore = s;
          best = det;
        }
      }

      if (!best) return null;

      const box = best.boundingBox;
      const rawX = (box.originX + box.width / 2) / vw;
      const rawY = (box.originY + box.height / 2) / vh;
      const mirroredX = 1 - rawX; // Mirror to match flipped canvas

      const center = {
        x: mirroredX,
        y: rawY,
        width: box.width / vw,
        height: box.height / vh,
        score: best.categories[0].score,
        ballScore: bestScore,
        label: best.categories[0].categoryName
      };

      // Smooth with EMA
      if (!this.smoothPos) {
        this.smoothPos = { ...center };
      } else {
        const a = this.smoothingAlpha;
        this.smoothPos.x = this.smoothPos.x * (1 - a) + center.x * a;
        this.smoothPos.y = this.smoothPos.y * (1 - a) + center.y * a;
        this.smoothPos.width = center.width;
        this.smoothPos.height = center.height;
        this.smoothPos.score = center.score;
        this.smoothPos.label = center.label;
      }

      return this.smoothPos;

    } catch (err) {
      if (this.frameCount % 100 === 0) {
        console.error('[BallTracker] error:', err.message);
      }
    }

    return null;
  }
}
