export class SensorFusion {
  /**
   * Fuses visual and audio detections to output high-confidence dribble events
   * @param {Object} visualEvent { detected, timestamp } 
   * @param {Object} audioEvent { detected, timestamp }
   * @param {number} toleranceMs Tolerance for timestamp difference
   * @returns {Object} Fused event
   */
  static fuseDribbleSignals(visualEvent, audioEvent, toleranceMs = 80) {
    // Case 1: Both signals agree within tolerance → high confidence dribble
    if (visualEvent.detected && audioEvent.detected) {
      const timeDiff = Math.abs(visualEvent.timestamp - audioEvent.timestamp);
      if (timeDiff < toleranceMs) {
        return { 
          detected: true, 
          confidence: 0.95,
          timestamp: (visualEvent.timestamp + audioEvent.timestamp) / 2,
          source: 'fused'
        };
      }
    }
    
    // Case 2: Only visual → medium confidence
    if (visualEvent.detected) {
      return { 
        detected: true, 
        confidence: 0.7,
        timestamp: visualEvent.timestamp,
        source: 'visual'
      };
    }
    
    // Case 3: Only audio → lower confidence (could be footstep, etc.)
    if (audioEvent.detected) {
      return { 
        detected: true, 
        confidence: 0.4,
        timestamp: audioEvent.timestamp,
        source: 'audio'
      };
    }
    
    return { detected: false };
  }
}
