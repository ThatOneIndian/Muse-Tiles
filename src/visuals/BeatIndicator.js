export class BeatIndicator {
  constructor(canvas, beatGrid) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.beatGrid = beatGrid;
    this.barWidth = canvas.width;
    this.barHeight = 40;
    this.barY = canvas.height - 50;
    this.lookAheadMs = 2000;  // show 2 seconds of upcoming beats
  }

  render(currentTime) {
    const ctx = this.ctx;
    
    // Draw bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, this.barY, this.barWidth, this.barHeight);
    
    // Draw center line (the "hit zone")
    const centerX = this.barWidth * 0.2;  // hit zone at 20% from left
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, this.barY);
    ctx.lineTo(centerX, this.barY + this.barHeight);
    ctx.stroke();
    
    // Draw upcoming beat markers scrolling from right to left
    const upcomingBeats = this.beatGrid.getUpcomingBeats(currentTime, 10);
    
    for (const beat of upcomingBeats) {
      // Map time to X position
      const progress = beat.relativeMs / this.lookAheadMs;
      const x = centerX + (progress * (this.barWidth - centerX));
      
      if (x < 0 || x > this.barWidth) continue;
      
      // Beat marker
      const size = 8;
      ctx.fillStyle = progress < 0.1 
        ? '#FFD700'  // gold when close
        : 'rgba(255, 255, 255, 0.6)';
      
      ctx.beginPath();
      // Diamond shape
      ctx.moveTo(x, this.barY + this.barHeight / 2 - size);
      ctx.lineTo(x + size, this.barY + this.barHeight / 2);
      ctx.lineTo(x, this.barY + this.barHeight / 2 + size);
      ctx.lineTo(x - size, this.barY + this.barHeight / 2);
      ctx.closePath();
      ctx.fill();
    }
  }
}
