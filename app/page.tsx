'use client';

import { useState } from 'react';
import { useMuseSession } from '../hooks/useMuseSession';
import { ParameterTile } from '../components/ParameterTile';
import { Music, Activity, Disc, Zap, Headphones, Mic, Send } from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  const { parameters, updateParameter, isLoaded } = useMuseSession();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Hey there! Let's get started. What kind of vibe are you aiming for today?" }
  ]);
  const [isSending, setIsSending] = useState(false);
  const [activeParameter, setActiveParameter] = useState('mood');

  if (!isLoaded) return null; // Wait for Mount

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSending) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMsg }],
          currentParameters: parameters
        })
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      // Update Chat
      setMessages(prev => [...prev, { role: 'ai', content: data.message }]);
      
      // Update Grid State
      if (data.track_parameters) {
        // We iterate through keys and update if value exists
        Object.entries(data.track_parameters).forEach(([key, value]) => {
          if (value) updateParameter(key as any, value);
        });
      }

      if (data.active_parameter) {
        setActiveParameter(data.active_parameter);
      }

    } catch (err: any) {
      console.error('Chat Error:', err);
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I hit a snag. Is your Gemini API Key set up?" }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.layout}>
        {/* Sidebar: AI Producer Chat */}
        <section className={`${styles.chatSidebar} glass`}>
          <div className={styles.chatHeader}>
            <h1 className="gradient-text">The Producer</h1>
            <p>Muse-Tiles Session</p>
          </div>
          
          <div className={styles.chatLog}>
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'ai' ? styles.aiMessage : styles.userMessage}>
                {msg.role === 'ai' && <Music className="text-neon-blue" size={18} />}
                <p>{msg.content}</p>
              </div>
            ))}
            {isSending && (
              <div className={styles.aiMessage}>
                <div className={styles.typingIndicator}>...</div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className={styles.chatInput}>
            <input 
              type="text" 
              placeholder="e.g. A chill, atmospheric Lo-fi vibe..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
            />
            <button 
              type="submit" 
              className={styles.sendBtn} 
              disabled={isSending || !input.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </section>

        {/* Main Stage: Dynamic Tile Grid */}
        <section className={styles.stage}>
          <header className={styles.stageHeader}>
            <h2>Current Project</h2>
            <button className={styles.exportBtn}>Export JSON</button>
          </header>

          <div className={styles.grid}>
            <ParameterTile 
              id="mood" 
              title="Mood" 
              value={parameters.mood} 
              icon={Activity} 
              isActive={activeParameter === 'mood'} 
            />
            <ParameterTile 
              id="genre" 
              title="Genre" 
              value={parameters.genre} 
              icon={Disc} 
              isActive={activeParameter === 'genre'} 
            />
            <ParameterTile 
              id="tempo" 
              title="Tempo" 
              value={parameters.tempo} 
              icon={Zap} 
              isActive={activeParameter === 'tempo'} 
            />
            <ParameterTile 
              id="primary_instrumentation" 
              title="Instruments" 
              value={parameters.primary_instrumentation} 
              icon={Headphones} 
              isActive={activeParameter === 'primary_instrumentation'} 
            />
            <ParameterTile 
              id="vocal_element" 
              title="Vocals" 
              value={parameters.vocal_element?.style} 
              icon={Mic} 
              isActive={activeParameter === 'vocal_element'} 
            />
          </div>
        </section>
      </div>
    </main>
  );
}
