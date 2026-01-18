import type { TransferItem } from '@/hooks/useFileTransfer';
import { File as FileIcon, ArrowUpRight, ArrowDownLeft, Download, Check, AlertCircle, Loader } from 'lucide-react';

interface FileHistoryTableProps {
  history: TransferItem[];
}

export function FileHistoryTable({ history }: FileHistoryTableProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: TransferItem['status']) => {
    switch (status) {
      case 'COMPLETED': return <Check size={16} />;
      case 'TRANSFERRING': return <Loader size={16} className="animate-spin" />;
      case 'ERROR': return <AlertCircle size={16} />;
      default: return <Loader size={16} />;
    }
  };

  const getStatusClass = (status: TransferItem['status']) => {
    switch (status) {
      case 'COMPLETED': return 'badge-success';
      case 'TRANSFERRING': return 'badge-warning'; 
      case 'ERROR': return 'badge-error';
      default: return 'badge-neutral';
    }
  };

  if (history.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p style={{ opacity: 0.4, marginBottom: '0.5rem' }}>No activity yet</p>
        <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>Files you send or receive will show up here</p>
      </div>
    );
  }

  return (
    <div className="glass-card animate-entry" style={{ overflow: 'hidden', backdropFilter: 'blur(20px)', background: 'var(--bg-panel)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>File Name</th>
              <th>Size</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                  <td>
                    {item.direction === 'OUTGOING' ? (
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '50%', display: 'inline-flex' }}>
                         <ArrowUpRight size={14} color="var(--text-secondary)" />
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '8px', borderRadius: '50%', display: 'inline-flex' }}>
                         <ArrowDownLeft size={14} color="var(--success)" />
                      </div>
                    )}
                  </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {formatSize(item.size)}
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className={`badge ${getStatusClass(item.status)}`}>
                      {getStatusIcon(item.status)}
                      <span>{item.status}</span>
                    </div>
                    {item.status === 'TRANSFERRING' && (
                       <div className="progress-bg" style={{ width: '100px', height: '3px', marginTop: '4px' }}>
                          <div className="progress-fill" style={{ width: `${item.progress}%` }}></div>
                       </div>
                    )}
                  </div>
                </td>
                <td>
                  {item.direction === 'INCOMING' && item.status === 'COMPLETED' && item.blob ? (
                    <a 
                      href={URL.createObjectURL(item.blob)} 
                      download={item.name} 
                      className="btn-icon"
                      title="Download"
                    >
                      <Download size={18} />
                    </a>
                  ) : (
                    <span style={{ opacity: 0.3 }}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
