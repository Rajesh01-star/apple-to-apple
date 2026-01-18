'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Copy, CheckCircle, Loader, Zap } from 'lucide-react';
import { FileHistoryTable } from '@/components/FileHistoryTable';
import { TransferZone } from '@/components/TransferZone';

export default function PortalRoom() {
  const params = useParams();
  const portalId = params?.portalId as string;
  const { status, history, initialize, sendFile, isConnected } = useWebRTC();

  useEffect(() => {
    if (!portalId) return;
    const cleanup = initialize(portalId);
    return cleanup;
  }, [portalId, initialize]);

  const copyKey = () => {
    navigator.clipboard.writeText(portalId);
    // Could add toast here
    alert('Portal Key copied!');
  };

  if (!portalId) return (
    <div className="center-flex" style={{ height: '100vh', gap: '1rem' }}>
      <Loader size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      <p style={{ color: 'var(--text-secondary)' }}>Initializing Portal...</p>
    </div>
  );

  return (
    <div className="container" style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      
      {/* Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '3rem 0 2rem 0',
      }}>
        <div className="animate-entry">
           {/* Minimal Header - just ID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 500 }}>
              Portal <span style={{ opacity: 0.5 }}>/</span> <span style={{ fontFamily: 'monospace' }}>{portalId}</span>
            </h1>
            <button onClick={copyKey} className="btn-icon" title="Copy Key">
              <Copy size={14} />
            </button>
          </div>
        </div>

        <div className="animate-entry animate-delay-1">
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '6px 12px', 
            borderRadius: '6px', 
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            color: status === 'CONNECTED' ? 'var(--success)' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 500
          }}>
            {status === 'CONNECTED' ? (
              <div style={{ width: 8, height: 8, background: 'var(--success)', borderRadius: '50%' }}></div>
            ) : (
              <div style={{ width: 8, height: 8, background: 'var(--text-secondary)', borderRadius: '50%' }}></div>
            )}
            {status === 'WAITING_FOR_PEER' ? 'Waiting' : status === 'CONNECTED' ? 'Connected' : status}
          </div>
        </div>
      </header>

      {/* Main Single Column */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Transfer Zone */}
        <section>
          <TransferZone onSend={sendFile} status={status} />
        </section>
        
        {/* History Table - Clean, below transfer */}
        <section className="animate-entry animate-delay-2">
           <FileHistoryTable history={history} />
        </section>

      </main>
    </div>
  );
}

