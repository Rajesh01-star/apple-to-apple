'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Copy, Upload, File as FileIcon, CheckCircle, Loader } from 'lucide-react';

export default function PortalRoom() {
  const params = useParams();
  const portalId = params?.portalId as string;
  const { status, progress, receivedFiles, initialize, sendFile, isConnected } = useWebRTC();
  const [fileToTransfer, setFileToTransfer] = useState<File | null>(null);

  useEffect(() => {
    if (!portalId) return;
    const cleanup = initialize(portalId);
    return cleanup;
  }, [portalId, initialize]);

  useEffect(() => {
    console.log('Status:', status);
    console.log('Is Connected:', isConnected);
  }, [status, isConnected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToTransfer(e.target.files[0]);
    }
  };

  const onSend = () => {
    if (fileToTransfer) {
      sendFile(fileToTransfer);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(portalId);
    alert('Portal Key copied!');
  };

  if (!portalId) return <div>Loading...</div>;

  return (
    <div className="container center-flex" style={{ minHeight: '100vh', justifyContent: 'flex-start', paddingTop: '10vh' }}>
      <div className="glass-panel animate-entry" style={{ width: '100%', maxWidth: '600px', padding: '2rem' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Portal Room</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <span>Key: <code style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{portalId}</code></span>
              <button onClick={copyKey} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                <Copy size={14} />
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '6px 12px', 
              borderRadius: '20px', 
              background: status === 'CONNECTED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: status === 'CONNECTED' ? 'var(--success)' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {status === 'CONNECTED' ? <CheckCircle size={16} /> : <Loader size={16} className={status === 'WAITING_FOR_PEER' ? 'spin' : ''} />}
              {status.replace(/_/g, ' ')}
            </div>
          </div>
        </header>

        <section style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Transfer Section */}
          <div style={{ padding: '2rem', border: '2px dashed var(--glass-border)', borderRadius: '12px', textAlign: 'center' }}>
            {['IDLE', 'WAITING_FOR_PEER'].includes(status) ? (
              <div style={{ color: 'var(--text-secondary)' }}>
                <p>Waiting for peer to join...</p>
                <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>Share the Key <strong>{portalId}</strong> with someone.</p>
              </div>
            ) : (
              <>
                {!fileToTransfer ? (
                  <>
                    <input 
                      type="file" 
                      id="file-upload" 
                      style={{ display: 'none' }} 
                      onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Upload size={20} /> Select File to Send
                    </label>
                  </>
                ) : (
                  <div className="center-flex">
                    <FileIcon size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                    <p style={{ marginBottom: '1rem', fontWeight: 600 }}>{fileToTransfer.name}</p>
                    {status === 'TRANSFERRING' ? (
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                      </div>
                    ) : (
                       <div style={{ display: 'flex', gap: '1rem' }}>
                          <button onClick={onSend} className="btn-primary">Send File</button>
                          <button onClick={() => setFileToTransfer(null)} className="btn-secondary">Cancel</button>
                       </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Received Files */}
          {receivedFiles.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Received Files</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {receivedFiles.map((file, idx) => (
                  <div key={idx} className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <FileIcon size={20} color="var(--accent-secondary)" />
                      <span>{file.name}</span>
                    </div>
                    <a 
                      href={URL.createObjectURL(file.blob)} 
                      download={file.name} 
                      className="btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 2s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  )
}
