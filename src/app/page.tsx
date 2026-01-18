'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Zap, Shield, Globe } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [joinKey, setJoinKey] = useState('');

  const createPortal = () => {
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
    <div className="container center-flex" style={{ minHeight: '100vh', justifyContent: 'center' }}>
      
      <main className="animate-entry" style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <h1 
          className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-white to-white/30 bg-clip-text text-center text-8xl font-semibold leading-none text-transparent"
          style={{ fontSize: '1.5rem', marginBottom: '2rem' }}
        >
          apple-to-apple
        </h1>

        <div className="glass-panel" style={{ padding: '2rem', width: '100%' }}>
            <button 
              onClick={createPortal} 
              className="btn-primary" 
              style={{ width: '100%', marginBottom: '1.5rem', height: '48px', fontSize: '0.95rem' }}
            >
              Create Portal
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
              <span style={{ padding: '0 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>OR JOIN</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            </div>

            <form onSubmit={joinPortal} style={{ display: 'flex', gap: '0.5rem'}}>
              <input
                type="text"
                className="glass-input"
                placeholder="Portal Key"
                value={joinKey}
                onChange={(e) => setJoinKey(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn-secondary"
                style={{ padding: '0 16px' }}
              >
                <ArrowRight size={18} />
              </button>
            </form>
        </div>
        
        <p style={{ marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Secure P2P file transfer.
        </p>

      </main>
    </div>
  )
}

