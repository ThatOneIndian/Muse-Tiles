import { useState, useRef, useEffect } from 'react';
import ConfigPanel from './config/ConfigPanel';
import './index.css';

function App() {
  const [appState, setAppState] = useState('config'); // config, generating, countdown, active, summary
  const [config, setConfig] = useState({
    genre: 'hip-hop',
    energy: 7,
    tempo_range: { min: 90, max: 130 },
    mood: 'upbeat',
    instruments: ['drums', 'bass'],
    duration_seconds: 90
  });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Setup webcam preview
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 },
          audio: true 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to access camera/mic:", err);
      }
    }
    setupCamera();
  }, []);

  const handleStart = async (newConfig) => {
    setConfig(newConfig);
    setAppState('generating');
    
    // TODO: Connect Lyria API here
    setTimeout(() => {
      setAppState('countdown');
    }, 2000);
  };

  useEffect(() => {
    if (appState === 'countdown') {
      setTimeout(() => setAppState('active'), 3000); // 3-second countdown
    }
  }, [appState]);

  return (
    <div className="app-container" style={{ width: '100%', height: '100%', padding: '2rem', boxSizing: 'border-box' }}>
      
      {/* Background glow effects */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(0,255,204,0.1) 0%, rgba(0,0,0,0) 70%)',
        zIndex: -1
      }}></div>
      
      {appState === 'config' && (
        <ConfigPanel 
          initialConfig={config} 
          onStart={handleStart} 
          videoRef={videoRef} 
        />
      )}

      {appState === 'generating' && (
        <div className="glass-panel" style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader" style={{
            width: '64px', height: '64px', borderRadius: '50%', border: '4px solid var(--panel-border)', borderTopColor: 'var(--accent-color)', animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          <h2>Generating Your Track...</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Lyria is mixing the beat</p>
        </div>
      )}

      {appState === 'countdown' && (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '8rem', color: 'var(--accent-color)', textShadow: '0 0 32px var(--accent-color)' }}>
            GET READY
          </h1>
        </div>
      )}

      {(appState === 'active' || appState === 'countdown' || appState === 'generating') && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: -1, opacity: 0.1 }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ borderRadius: '16px', border: '2px solid #fff' }}></video>
        </div>
      )}

      {appState === 'active' && (
        <div className="active-session" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
             <div className="glass-panel" style={{ padding: '1rem 2rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Score</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>0</div>
             </div>
             <div className="glass-panel" style={{ padding: '1rem 2rem', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>BPM</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-color)' }}>--</div>
             </div>
             <div className="glass-panel" style={{ padding: '1rem 2rem', textAlign: 'right' }}>
                <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Combo</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>--</div>
             </div>
          </header>

          <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <video autoPlay playsInline muted style={{ display: 'none' }}></video>
            <canvas ref={canvasRef} width={1280} height={720} style={{
              width: '100%', maxHeight: '60vh', objectFit: 'contain',
              borderRadius: '16px', border: '1px solid var(--panel-border)'
            }}></canvas>
          </div>

          <div className="glass-panel" style={{ marginTop: '2rem', height: '80px', position: 'relative', overflow: 'hidden' }}>
             {/* Beat indicator bar placeholder */}
             <div style={{ position: 'absolute', left: '20%', top: 0, bottom: 0, width: '4px', background: 'rgba(255,255,255,0.8)', boxShadow: '0 0 12px #fff' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
