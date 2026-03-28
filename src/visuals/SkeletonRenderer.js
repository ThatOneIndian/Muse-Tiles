import { PoseLandmarker } from '@mediapipe/tasks-vision';

export class SkeletonRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.currentScoreColor = '#00ffcc'; // Default color
    
    // MediaPipe helper to draw the connections
    this.connections = PoseLandmarker.POSE_CONNECTIONS;
  }

  setScoreColor(rating) {
    switch (rating) {
      case 'perfect': this.currentScoreColor = '#FFD700'; break; // Gold
      case 'great': this.currentScoreColor = '#00BFFF'; break; // Blue
      case 'good': this.currentScoreColor = '#00FF00'; break; // Green
      case 'miss': this.currentScoreColor = '#FF0000'; break; // Red
      default: this.currentScoreColor = '#00ffcc'; break;
    }
  }

  render(landmarks) {
    if (!landmarks || landmarks.length === 0) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    // Draw connections (bones)
    ctx.lineWidth = 4;
    ctx.strokeStyle = this.currentScoreColor;
    
    for (const connection of this.connections) {
      const p1 = landmarks[connection.start];
      const p2 = landmarks[connection.end];
      
      if (p1.visibility > 0.5 && p2.visibility > 0.5) {
        ctx.beginPath();
        // MediaPipe coords are normalized [0,1]
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    }

    // Draw points (joints)
    ctx.fillStyle = '#FFFFFF';
    for (const p of landmarks) {
      if (p.visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    
    // Highlight wrists (15, 16) specifically to emphasize dribble tracking
    ctx.fillStyle = '#FF00FF'; // Magenta
    if (landmarks[15]?.visibility > 0.5) {
      ctx.beginPath();
      ctx.arc(landmarks[15].x * width, landmarks[15].y * height, 8, 0, 2 * Math.PI);
      ctx.fill();
    }
    if (landmarks[16]?.visibility > 0.5) {
      ctx.beginPath();
      ctx.arc(landmarks[16].x * width, landmarks[16].y * height, 8, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
