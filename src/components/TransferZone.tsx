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
        padding: '3rem', 
        border: isDragOver ? '1px dashed var(--text-primary)' : '1px solid var(--border-color)', // Solid, subtle border
        borderRadius: '16px', // Smooth rounding
        background: isDragOver ? 'var(--bg-panel)' : 'transparent', // Use panel bg on hover
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transform: isDragOver ? 'scale(1.02)' : 'scale(1)', // Smooth scale
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth bezier
        textAlign: 'center',
        cursor: 'pointer',
        minHeight: '240px', // Slightly taller
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: isDragOver ? '0 10px 40px -10px rgba(0,0,0,0.5)' : 'none'
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
            <Upload size={32} strokeWidth={1} style={{ opacity: 0.8 }} />
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
