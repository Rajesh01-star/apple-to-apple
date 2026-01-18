import { useState, useRef } from 'react';
import { Upload, FileIcon, X } from 'lucide-react';

interface TransferZoneProps {
  onSend: (file: File) => void;
  status: string;
}

export function TransferZone({ onSend, status }: TransferZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSend = () => {
    if (selectedFile) {
      onSend(selectedFile);
      setSelectedFile(null); // Clear after sending
    }
  };

  // If transferring, we show a simplified state or just keep the dropper available for queuing (if we supported queueing)
  // For now, let's keep it simple.

  return (
    <div 
      className={`animate-entry animate-delay-1 ${isDragOver ? 'drag-active' : ''}`}
      style={{ 
        padding: '2.5rem', 
        border: isDragOver ? '1px dashed var(--text-primary)' : '1px dashed var(--border-color)',
        borderRadius: '8px',
        backgroundColor: isDragOver ? 'rgba(255,255,255,0.02)' : 'transparent',
        transition: 'all 0.2s',
        textAlign: 'center',
        cursor: 'pointer',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {!selectedFile ? (
        <>
          <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <Upload size={24} strokeWidth={1.5} />
          </div>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            Drop files here
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            or click to select
          </p>
        </>
      ) : (
        <div className="animate-entry">
          <div style={{ marginBottom: '1rem' }}>
            <FileIcon size={32} strokeWidth={1.5} color="var(--text-primary)" style={{ margin: '0 auto', display: 'block' }} />
          </div>
          <p style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>{selectedFile.name}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
          
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleSend(); }}
              className="btn-primary"
              disabled={status !== 'CONNECTED'}
              style={{ opacity: status !== 'CONNECTED' ? 0.5 : 1, fontSize: '0.85rem', padding: '8px 16px' }}
            >
              {status === 'CONNECTED' ? 'Send' : 'Waiting...'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
