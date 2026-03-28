export class RhythmEngine {
  constructor() {
    this.dribbleTimestamps = [];   // circular buffer
    this.MAX_HISTORY = 20;
    this.currentBPM = 120; // Default
    this.bpmStable = false;        // true after sufficient samples
    this.bpmHistory = [];          // for smoothing BPM transitions
    this.MAX_BPM_HISTORY = 8;
  }

  onDribble(timestamp) {
    this.dribbleTimestamps.push(timestamp);
    if (this.dribbleTimestamps.length > this.MAX_HISTORY) {
      this.dribbleTimestamps.shift();
    }

    if (this.dribbleTimestamps.length < 4) {
      this.bpmStable = false;
      return null;
    }

    // Calculate inter-dribble intervals
    const intervals = [];
    for (let i = 1; i < this.dribbleTimestamps.length; i++) {
      intervals.push(this.dribbleTimestamps[i] - this.dribbleTimestamps[i - 1]);
    }

    // Outlier rejection: remove intervals that deviate > 40% from median
    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const filtered = intervals.filter(
      i => Math.abs(i - median) / median < 0.4
    );

    if (filtered.length < 3) return null;

    // Exponential weighted moving average (recent intervals matter more)
    const alpha = 0.3;  // smoothing factor
    let ewma = filtered[0];
    for (let i = 1; i < filtered.length; i++) {
      ewma = alpha * filtered[i] + (1 - alpha) * ewma;
    }

    const rawBPM = 60000 / ewma;

    // Smooth BPM transitions to prevent jitter
    this.bpmHistory.push(rawBPM);
    if (this.bpmHistory.length > this.MAX_BPM_HISTORY) {
      this.bpmHistory.shift();
    }

    // Weighted average of BPM history
    const weights = this.bpmHistory.map((_, i) => Math.pow(2, i));
    const weightSum = weights.reduce((a, b) => a + b, 0);
    this.currentBPM = this.bpmHistory.reduce(
      (sum, bpm, i) => sum + bpm * weights[i], 0
    ) / weightSum;

    // Clamp to reasonable basketball dribble range
    this.currentBPM = Math.max(60, Math.min(200, this.currentBPM));

    // Mark stable after 6+ consistent readings
    const variance = this.calculateVariance(this.bpmHistory);
    this.bpmStable = this.bpmHistory.length >= 6 && variance < 100;

    return {
      bpm: Math.round(this.currentBPM),
      stable: this.bpmStable,
      confidence: Math.min(1, this.bpmHistory.length / 8),
      intervalMs: ewma
    };
  }

  calculateVariance(arr) {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  }
}
