import { useRef, useState, useCallback } from 'react';
import { Buffer } from 'buffer';

const CHUNK_SIZE = 16384; // 16KB chunks

export type TransferStatus = 'IDLE' | 'WAITING_FOR_PEER' | 'CONNECTED' | 'TRANSFERRING' | 'COMPLETED' | 'ERROR';

export interface TransferItem {
  id: string;
  name: string;
  size: number;
  type: string;
  direction: 'INCOMING' | 'OUTGOING';
  status: 'PENDING' | 'TRANSFERRING' | 'COMPLETED' | 'ERROR';
  progress: number;
  blob?: Blob; // For received files
  timestamp: number;
}

interface UseFileTransferProps {
  sendData: (data: any) => boolean;
  waitForDrain: () => Promise<void>;
  isConnected: boolean;
}

export function useFileTransfer({ sendData, waitForDrain, isConnected }: UseFileTransferProps) {
  const [transferStatus, setTransferStatus] = useState<TransferStatus>('IDLE');
  const [progress, setProgress] = useState(0); // Keeping for backward compatibility/single active transfer view
  
  // Unified history state
  const [history, setHistory] = useState<TransferItem[]>([]);

  // Refs for receiving
  const receiveBuffer = useRef<ArrayBuffer[]>([]);
  const receivedSize = useRef(0);
  const currentFileMeta = useRef<{ id: string; name: string; size: number; type: string } | null>(null);

  const updateHistoryItem = useCallback((id: string, updates: Partial<TransferItem>) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const handleReceivedData = useCallback((data: any) => {
    // Attempt to parse metadata logic
    try {
      const str = new TextDecoder().decode(data);
      if (str.startsWith('{"meta":')) {
        try {
          const parsed = JSON.parse(str);
          // Received new file metadata
          const fileId = parsed.meta.id || crypto.randomUUID(); // Fallback if sender didn't send ID
          
          currentFileMeta.current = { ...parsed.meta, id: fileId };
          receiveBuffer.current = [];
          receivedSize.current = 0;
          
          setTransferStatus('TRANSFERRING');
          
          // Add to history
          setHistory(prev => [{
            id: fileId,
            name: parsed.meta.name,
            size: parsed.meta.size,
            type: parsed.meta.type,
            direction: 'INCOMING',
            status: 'TRANSFERRING',
            progress: 0,
            timestamp: Date.now()
          }, ...prev]);

          console.log('📦 Metadata received:', parsed.meta);
          return;
        } catch (e) {
          // If parse fails, it might be binary data
        }
      }
    } catch (e) {
      // Not a string, proceed
    }

    const meta = currentFileMeta.current;
    if (!meta) {
      console.warn('❌ Received chunk but no metadata set');
      return;
    }

    receiveBuffer.current.push(data);
    receivedSize.current += data.byteLength || data.length;

    const pct = Math.round((receivedSize.current / meta.size) * 100);
    setProgress(pct);
    updateHistoryItem(meta.id, { progress: pct });

    if (receivedSize.current >= meta.size) {
      console.log('✅ All chunks received, creating blob...');
      const blob = new Blob(receiveBuffer.current, { type: meta.type });
      
      setTransferStatus('COMPLETED');
      updateHistoryItem(meta.id, { status: 'COMPLETED', progress: 100, blob });
      
      // Reset for next file
      currentFileMeta.current = null;
      receiveBuffer.current = [];
      receivedSize.current = 0;
      console.log('🎉 File transfer complete!');
    }
  }, [updateHistoryItem]);

  const sendFile = useCallback(async (file: File) => {
    if (!isConnected) {
      console.error('❌ Cannot send file: Not connected');
      setTransferStatus('ERROR');
      return;
    }

    const fileId = crypto.randomUUID();
    const newTransfer: TransferItem = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      direction: 'OUTGOING',
      status: 'TRANSFERRING',
      progress: 0,
      timestamp: Date.now()
    };

    setHistory(prev => [newTransfer, ...prev]);
    setTransferStatus('TRANSFERRING');
    setProgress(0);

    try {
      console.log('📤 Starting file transfer:', file.name);

      // 1. Send Metadata
      const meta = JSON.stringify({
        meta: {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type
        }
      });
      sendData(meta);

      // Wait a bit for metadata to be processed by receiver
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. Stream Data in chunks
      const arrayBuffer = await file.arrayBuffer();
      const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE);

      console.log(`📤 Sending ${totalChunks} chunks`);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
        const chunk = arrayBuffer.slice(start, end);
        const bufferChunk = Buffer.from(chunk);

        const canContinue = sendData(bufferChunk);

        const currentProgress = Math.round(((i + 1) / totalChunks) * 100);
        setProgress(currentProgress);
        updateHistoryItem(fileId, { progress: currentProgress });

        if (!canContinue) {
          await waitForDrain();
        }
      }

      console.log('✅ File sent successfully');
      setTransferStatus('COMPLETED');
      updateHistoryItem(fileId, { status: 'COMPLETED', progress: 100 });

    } catch (error) {
      console.error('❌ Error sending file:', error);
      setTransferStatus('ERROR');
      updateHistoryItem(fileId, { status: 'ERROR' });
    }
  }, [isConnected, sendData, updateHistoryItem]);

  const resetTransferState = useCallback(() => {
    setTransferStatus('IDLE');
    setProgress(0);
    // We do NOT clear history on reset, as users might want to keep the log
  }, []);

  return {
    transferStatus,
    setTransferStatus,
    progress,
    history, // Exposed Unified History
    sendFile,
    handleReceivedData,
    resetTransferState
  };
}

