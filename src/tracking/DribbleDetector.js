class VelocityTracker {
  constructor() {
    this.history = [];  // ring buffer of {y, timestamp} entries
    this.maxHistory = 5; // smoothing window
  }

  update(y, timestamp) {
    this.history.push({ y, timestamp });
    if (this.history.length > this.maxHistory) this.history.shift();
    
    if (this.history.length < 2) return 0;
    
    // Use weighted average of recent velocity samples for smoothing
    let totalVelocity = 0;
    let totalWeight = 0;
    
    for (let i = 1; i < this.history.length; i++) {
      const dy = this.history[i].y - this.history[i - 1].y;
      const dt = this.history[i].timestamp - this.history[i - 1].timestamp;
      if (dt === 0) continue;
      
      const velocity = dy / dt;  // units per millisecond
      const weight = i;  // recent samples weighted more
      totalVelocity += velocity * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalVelocity / totalWeight : 0;
  }
}

export class DribbleDetector {
  constructor() {
    this.leftTracker = new VelocityTracker();
    this.rightTracker = new VelocityTracker();
    
    this.prevLeftVelocity = 0;
    this.prevRightVelocity = 0;
    
    this.lastDribbleTime = 0;
    this.MIN_DRIBBLE_INTERVAL = 200;  // ms — prevents double-triggers (max ~300 BPM)
    this.MIN_VELOCITY_THRESHOLD = 0.001; // Normalized units/ms threshold - Needs tuning
    
    // Which hand is dribbling
    this.dominantHand = null;
    this.leftDribbleCount = 0;
    this.rightDribbleCount = 0;
  }

  // Convert MediaPipe coords [0, 1] to a metric format
  extractWristData(landmarks) {
    return {
      left: {
        y: landmarks[15].y,
        z: landmarks[15].z,
        visibility: landmarks[15].visibility
      },
      right: {
        y: landmarks[16].y,
        z: landmarks[16].z,
        visibility: landmarks[16].visibility
      }
    };
  }

  processFrame(landmarks, timestamp) {
    if (!landmarks || landmarks.length < 17) return { detected: false };

    const wrists = this.extractWristData(landmarks);
    
    // MediaPipe Y is top-down (0 at top, 1 at bottom). Moving down = positive velocity.
    const leftVelocity = this.leftTracker.update(wrists.left.y, timestamp);
    const rightVelocity = this.rightTracker.update(wrists.right.y, timestamp);
    
    let dribbleDetected = false;
    let dribbleHand = null;
    
    // Check left wrist for zero-crossing (downward → upward)
    if (this.prevLeftVelocity > this.MIN_VELOCITY_THRESHOLD && leftVelocity <= 0) {
      if (timestamp - this.lastDribbleTime > this.MIN_DRIBBLE_INTERVAL) {
        dribbleDetected = true;
        dribbleHand = 'left';
        this.leftDribbleCount++;
      }
    }
    
    // Check right wrist for zero-crossing
    if (this.prevRightVelocity > this.MIN_VELOCITY_THRESHOLD && rightVelocity <= 0) {
      if (timestamp - this.lastDribbleTime > this.MIN_DRIBBLE_INTERVAL) {
        dribbleDetected = true;
        dribbleHand = 'right';
        this.rightDribbleCount++;
      }
    }
    
    if (dribbleDetected) {
      this.lastDribbleTime = timestamp;
      
      // Auto-detect dominant hand after 10 dribbles
      if (this.leftDribbleCount + this.rightDribbleCount > 10) {
        this.dominantHand = this.leftDribbleCount > this.rightDribbleCount 
          ? 'left' : 'right';
      }
    }
    
    this.prevLeftVelocity = leftVelocity;
    this.prevRightVelocity = rightVelocity;
    
    return {
      detected: dribbleDetected,
      hand: dribbleHand,
      timestamp: timestamp,
      velocityMagnitude: dribbleHand === 'left' 
        ? Math.abs(this.prevLeftVelocity) 
        : Math.abs(this.prevRightVelocity),
      wristPositions: wrists
    };
  }
}
