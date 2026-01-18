'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Zap } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [joinKey, setJoinKey] = useState('');

  const createPortal = () => {
    // Generate random 6-character string
    const portalId = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/${portalId}`);
  };

  const joinPortal = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinKey.trim().length > 0) {
      router.push(`/${joinKey.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="container center-flex" style={{ minHeight: '100vh' }}>
      <main className="hero-section animate-entry">
        <h1 className="hero-title">
          Portal <span style={{ color: 'var(--accent-primary)' }}>P2P</span>
        </h1>
        <p className="hero-subtitle">
          Secure, direct browser-to-browser file transfer. No servers, no limits.
          Just you, your peer, and the data.
        </p>

        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
          <button 
            onClick={createPortal} 
            className="btn-primary" 
            style={{ width: '100%', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Zap size={20} /> Create New Portal
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0', opacity: 0.5 }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--text-secondary)' }}></div>
            <span style={{ padding: '0 1rem', fontSize: '0.9rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--text-secondary)' }}></div>
          </div>

          <form onSubmit={joinPortal}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="glass-input"
                placeholder="Enter Portal Key"
                value={joinKey}
                onChange={(e) => setJoinKey(e.target.value)}
              />
              <button type="submit" className="btn-secondary" style={{ padding: '12px' }}>
                <ArrowRight size={20} />
              </button>
            </div>
          </form>
        </div>
      </main>
      
      <footer style={{ marginTop: 'auto', padding: '2rem', opacity: 0.5, fontSize: '0.9rem' }}>
        <p>Built with Next.js & WebRTC</p>
      </footer>
    </div>
  )
}
