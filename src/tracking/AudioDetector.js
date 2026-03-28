export class AudioDribbleDetector {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    
    this.prevEnergy = 0;
    this.threshold = 0.6;  // Set initial default, calibrate during warmup
    this.lastTrigger = 0;
    this.isInitialized = false;
  }

  async init(stream) {
    if (this.isInitialized) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
      
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      this.isInitialized = true;
    } catch (e) {
      console.error("Failed to init AudioDribbleDetector:", e);
    }
  }

  detect(timestamp) {
    if (!this.isInitialized) return { detected: false };

    this.analyser.getByteTimeDomainData(this.dataArray);
    
    // Calculate short-term energy (RMS)
    let sum = 0;
    for (let i = 0; i < this.bufferLength; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / this.bufferLength);
    
    // Detect transient: sudden energy spike
    const energyDelta = rms - this.prevEnergy;
    this.prevEnergy = rms * 0.7 + this.prevEnergy * 0.3;  // smooth
    
    if (energyDelta > this.threshold && (timestamp - this.lastTrigger) > 150) {
      this.lastTrigger = timestamp;
      return { detected: true, energy: rms, timestamp };
    }
    
    return { detected: false };
  }
}
