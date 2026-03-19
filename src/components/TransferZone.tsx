import { useState, useRef } from 'react';
import { Upload, FileIcon, X } from 'lucide-react';

interface TransferZoneProps {
  onSend: (files: File[]) => void;
  status: string;
}

export function TransferZone({ onSend, status }: TransferZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (selectedFiles.length > 0) {
      onSend(selectedFiles);
      setSelectedFiles([]);
    }
  };

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

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
        cursor: selectedFiles.length === 0 ? 'pointer' : 'default',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onClick={() => selectedFiles.length === 0 && fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        multiple
      />

      {selectedFiles.length === 0 ? (
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
        <div className="animate-entry" style={{ width: '100%' }}>
          {/* File list */}
          <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
            {selectedFiles.map((file, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--bg-panel)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                textAlign: 'left',
              }}>
                <FileIcon size={16} strokeWidth={1.5} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', flexShrink: 0 }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex', flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem', fontFamily: 'monospace' }}>
            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} &middot; {(totalSize / 1024 / 1024).toFixed(2)} MB total
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); }}
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '8px 16px' }}
            >
              Add more
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleSend(); }}
              className="btn-primary"
              disabled={status !== 'CONNECTED'}
              style={{ opacity: status !== 'CONNECTED' ? 0.5 : 1, fontSize: '0.85rem', padding: '8px 16px' }}
            >
              {status === 'CONNECTED'
                ? `Send ${selectedFiles.length > 1 ? `${selectedFiles.length} files` : 'file'}`
                : 'Waiting...'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
