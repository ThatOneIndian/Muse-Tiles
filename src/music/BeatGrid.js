export class BeatGrid {
  constructor() {
    this.bpm = 120;
    this.beats = [];         // array of absolute timestamps (ms)
    this.startTime = null;
    this.lookAheadMs = 3000; // pre-compute 3 seconds of beats ahead
  }

  initialize(bpm, startTime) {
    this.bpm = bpm;
    this.startTime = startTime;
    this.regenerate();
  }

  regenerate() {
    const intervalMs = 60000 / this.bpm;
    this.beats = [];
    
    const now = performance.now();
    // Find the nearest beat to "now" and build forward
    const elapsed = now - this.startTime;
    const beatsSinceStart = Math.floor(elapsed / intervalMs);
    const nextBeatTime = this.startTime + (beatsSinceStart + 1) * intervalMs;
    
    // Generate beats from now to lookAhead
    for (let t = nextBeatTime; t < now + this.lookAheadMs; t += intervalMs) {
      this.beats.push(t);
    }
  }

  updateBPM(newBPM) {
    if (Math.abs(newBPM - this.bpm) < 2) return;  // ignore tiny changes
    
    // Smooth transition: don't snap, interpolate over 4 beats
    const oldInterval = 60000 / this.bpm;
    const newInterval = 60000 / newBPM;
    
    this.bpm = newBPM;
    
    // Rebuild the grid from the last confirmed beat
    const now = performance.now();
    const lastBeat = this.beats.filter(b => b <= now).pop() || now;
    
    this.beats = this.beats.filter(b => b <= now);
    
    // Gradually interpolate interval over 4 beats
    let currentInterval = oldInterval;
    const step = (newInterval - oldInterval) / 4;
    let nextBeat = lastBeat;
    
    for (let i = 0; i < 20; i++) {
      if (i < 4) {
        currentInterval += step;
      } else {
        currentInterval = newInterval;
      }
      nextBeat += currentInterval;
      this.beats.push(nextBeat);
    }
  }

  // Get the nearest beat to a given timestamp
  getNearestBeat(timestamp) {
    if (this.beats.length === 0) return { beatTime: 0, offsetMs: 1000 };

    let nearest = this.beats[0];
    let minDiff = Math.abs(timestamp - nearest);
    
    for (const beat of this.beats) {
      const diff = Math.abs(timestamp - beat);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = beat;
      }
    }
    
    return { beatTime: nearest, offsetMs: timestamp - nearest };
  }

  // Get upcoming beats for the beat indicator bar
  getUpcomingBeats(currentTime, count = 8) {
    return this.beats
      .filter(b => b > currentTime)
      .slice(0, count)
      .map(b => ({ time: b, relativeMs: b - currentTime }));
  }
}
