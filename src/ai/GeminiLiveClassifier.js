export class GeminiLiveClassifier {
  constructor(apiKey) {
    this.ws = null;
    this.apiKey = apiKey;
    this.currentClassification = {
      style: 'standard',
      energy: 5,
      pattern: 'steady',
      confidence: 0
    };
    this.frameInterval = 1000; // send 1 frame per second
    this.lastFrameSent = 0;
  }

  async connect() {
    if (!this.apiKey) return;
    
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("Gemini Live connected");
      this.ws.send(JSON.stringify({
        setup: {
          model: "models/gemini-2.0-flash-live-preview", // Updated to generic live model or preview
          generationConfig: {
            responseModalities: ["TEXT"],
            temperature: 0.1
          },
          systemInstruction: {
            parts: [{
              text: `You are a basketball dribble analyzer. You receive video frames 
              of a person dribbling a basketball. Respond ONLY with a JSON object 
              classifying what you observe. Do not include any other text.
              Output format:
              {
                "style": "standard" | "crossover" | "between_legs" | "behind_back" | "spin" | "hesitation",
                "energy": <1-10>,
                "pattern": "steady" | "accelerating" | "decelerating" | "freestyle" | "stationary",
                "hand": "left" | "right" | "alternating",
                "confidence": <0.0-1.0>
              }`
            }]
          }
        }
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.serverContent?.modelTurn?.parts) {
          const text = data.serverContent.modelTurn.parts.filter(p => p.text).map(p => p.text).join('');
          
          // Try to extract JSON from the text
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const classification = JSON.parse(match[0]);
            this.currentClassification = { ...this.currentClassification, ...classification };
            console.log("Gemini Live Style Update:", this.currentClassification);
          }
        }
      } catch (e) {
        // Ignore parsing errors on partial frames
      }
    };
    
    this.ws.onerror = (e) => console.error("Gemini live WebSocket error", e);
  }

  maybeSendFrame(canvas, timestamp) {
    if (timestamp - this.lastFrameSent < this.frameInterval) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.lastFrameSent = timestamp;

    try {
      // Compress frame heavily for quick streaming
      const frameData = canvas.toDataURL('image/jpeg', 0.5); 
      const base64 = frameData.split(',')[1];

      this.ws.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: "image/jpeg",
            data: base64
          }]
        }
      }));
    } catch(e) {
      console.error("Failed to send frame to Gemini", e);
    }
  }

  getClassification() {
    return this.currentClassification;
  }
}
