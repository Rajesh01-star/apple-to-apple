import { useRef, useState, useCallback } from 'react';

const CHUNK_SIZE = 16384; // 16KB chunks

export type TransferStatus = 'IDLE' | 'WAITING_FOR_PEER' | 'CONNECTED' | 'TRANSFERRING' | 'COMPLETED' | 'ERROR';

interface UseFileTransferProps {
  sendData: (data: any) => boolean;
  waitForDrain: () => Promise<void>;
  isConnected: boolean;
}

export function useFileTransfer({ sendData, waitForDrain, isConnected }: UseFileTransferProps) {
  const [transferStatus, setTransferStatus] = useState<TransferStatus>('IDLE');
  const [progress, setProgress] = useState(0);
  const [receivedFiles, setReceivedFiles] = useState<any[]>([]);

  // Refs for receiving
  const receiveBuffer = useRef<ArrayBuffer[]>([]);
  const receivedSize = useRef(0);
  const currentFileMeta = useRef<{ name: string; size: number; type: string } | null>(null);

  const handleReceivedData = useCallback((data: any) => {
    // Attempt to parse metadata logic
    // We try to decode strings first to see if it's our JSON metadata
    try {
      const str = new TextDecoder().decode(data);
      if (str.startsWith('{"meta":')) {
        try {
          const parsed = JSON.parse(str);
          currentFileMeta.current = parsed.meta;
          receiveBuffer.current = [];
          receivedSize.current = 0;
          setTransferStatus('TRANSFERRING');
          console.log('📦 Metadata received:', parsed.meta);
          return;
        } catch (e) {
          // If parse fails, it might be binary data that coincidentally looks like a string, proceed to binary handling
        }
      }
    } catch (e) {
      // Not a string, proceed
    }

    const meta = currentFileMeta.current;
    if (!meta) {
      // If we don't have metadata yet, we might have received a chunk out of order or error
      // But in this simple implementation, we just log error
      // Note: In real app, might want to be more robust
      // For now, treat as binary chunk if possible, but we need meta to know when to stop
      console.warn('❌ Received chunk but no metadata set');
      return;
    }

    receiveBuffer.current.push(data);
    receivedSize.current += data.byteLength || data.length;

    const pct = Math.round((receivedSize.current / meta.size) * 100);
    setProgress(pct);

    if (receivedSize.current >= meta.size) {
      console.log('✅ All chunks received, creating blob...');
      const blob = new Blob(receiveBuffer.current, { type: meta.type });
      setReceivedFiles(prev => [...prev, { name: meta.name, blob }]);
      setTransferStatus('COMPLETED');
      
      // Reset for next file
      currentFileMeta.current = null;
      receiveBuffer.current = [];
      receivedSize.current = 0;
      console.log('🎉 File transfer complete!');
    }
  }, []);

  const sendFile = useCallback(async (file: File) => {
    if (!isConnected) {
      console.error('❌ Cannot send file: Not connected');
      setTransferStatus('ERROR');
      return;
    }

    setTransferStatus('TRANSFERRING');
    setProgress(0);

    try {
      console.log('📤 Starting file transfer:', file.name);

      // 1. Send Metadata
      const meta = JSON.stringify({
        meta: {
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
        // Basic check if we should abort (e.g. if connection dropped externally)
        // Since we don't have direct access to 'connected' state inside the loop continuously updating 
        // without ref updates, we assume sendData will handle/throw if disconnected
        
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
        const chunk = arrayBuffer.slice(start, end);

        const canContinue = sendData(chunk);

        const currentProgress = Math.round(((i + 1) / totalChunks) * 100);
        setProgress(currentProgress);

        // correct backpressure handling
        if (!canContinue) {
          // console.log('⏳ Backpressure: waiting for drain'); // Optional log to avoid spam
          await waitForDrain();
        }
      }

      console.log('✅ File sent successfully');
      setTransferStatus('COMPLETED');
    } catch (error) {
      console.error('❌ Error sending file:', error);
      setTransferStatus('ERROR');
    }
  }, [isConnected, sendData]);

  const resetTransferState = useCallback(() => {
    setTransferStatus('IDLE');
    setProgress(0);
    // Don't clear received files as user might want to see them
  }, []);

  return {
    transferStatus,
    setTransferStatus, // Expose setter if parent needs to override (e.g. to 'WAITING_FOR_PEER')
    progress,
    receivedFiles,
    sendFile,
    handleReceivedData,
    resetTransferState
  };
}
