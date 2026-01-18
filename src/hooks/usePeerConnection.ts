import { useRef, useState, useCallback, useEffect } from 'react';
import SimplePeer, { Instance as PeerInstance } from 'simple-peer';

// Helper to ensure global objects for SimplePeer in browser environment
if (typeof window !== 'undefined') {
  // @ts-ignore
  if (!window.Buffer) window.Buffer = require('buffer').Buffer;
  // @ts-ignore
  if (!window.process) window.process = require('process');
}

type PeerStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

interface UsePeerConnectionProps {
  onSignal: (type: 'offer' | 'answer' | 'ice-candidate', payload: any) => void;
  onData: (data: any) => void;
  onConnect: () => void;
  onClose: () => void;
  onError: (err: Error) => void;
}

export function usePeerConnection({ onSignal, onData, onConnect, onClose, onError }: UsePeerConnectionProps) {
  const peerRef = useRef<PeerInstance | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<PeerStatus>('IDLE');
  const targetPeerId = useRef<string | null>(null);
  
  // Track if we are currently in the process of creating a peer to avoid race conditions
  const isCreatingPeer = useRef(false);
  const pendingSignals = useRef<any[]>([]);
  const lastHeartbeat = useRef<number>(0);
  const retryCount = useRef(0);
  const isIntentionalClose = useRef(false);
  const isInitiatorRef = useRef(false);

  const createPeer = useCallback((targetId: string, initiator: boolean) => {
    if (peerRef.current) {
      console.log('⚠️ Peer already exists, skipping creation');
      return;
    }

    if (isCreatingPeer.current) {
      console.log('⚠️ Already creating peer, skipping');
      return;
    }

    isCreatingPeer.current = true;
    targetPeerId.current = targetId;
    isInitiatorRef.current = initiator;
    isIntentionalClose.current = false;
    setConnectionStatus('CONNECTING');
    
    console.log(`Creating peer - Target: ${targetId}, Initiator: ${initiator}`);

    const peer = new SimplePeer({
      initiator: initiator,
      trickle: true,
      channelName: 'fileTransfer',
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (data) => {
      // Determine signal type based on data properties if not explicit
      // SimplePeer signals are usually objects.
      let type: 'offer' | 'answer' | 'ice-candidate';
      if (data.type === 'offer') type = 'offer';
      else if (data.type === 'answer') type = 'answer';
      else type = 'ice-candidate';

      onSignal(type, {
        target: targetId,
        sdp: type === 'ice-candidate' ? undefined : data,
        candidate: type === 'ice-candidate' ? data : undefined
      });
    });

    peer.on('connect', () => {
      console.log('✅✅✅ PEER CONNECTED! ✅✅✅');
      setConnectionStatus('CONNECTED');
      isCreatingPeer.current = false;
      retryCount.current = 0; // Reset retries on success
      onConnect();


    });

    peer.on('data', (data) => {
      let isHeartbeat = false;
      
      if (typeof data === 'string' && data === 'HEARTBEAT') {
        isHeartbeat = true;
      } else {
        try {
           // 'HEARTBEAT' is 9 bytes
           if (data.length === 9 || data.byteLength === 9) {
             const str = new TextDecoder().decode(data);
             if (str === 'HEARTBEAT') isHeartbeat = true;
           }
        } catch(e) {}
      }

      if (isHeartbeat) {
        lastHeartbeat.current = Date.now();
        return;
      }
      
      lastHeartbeat.current = Date.now();
      onData(data);
    });

    peer.on('error', (err) => {
      console.error('❌ Peer error:', err);
      setConnectionStatus('ERROR');
      isCreatingPeer.current = false;
      onError(err);
    });

    peer.on('close', () => {
      console.log('🔌 Connection closed');
      
      const wasIntentional = isIntentionalClose.current;
      const currentTarget = targetPeerId.current;
      const wasInitiator = isInitiatorRef.current;

      peerRef.current = null;
      targetPeerId.current = null;
      isCreatingPeer.current = false;
      setConnectionStatus('IDLE');

      // Attempt reconnection if unintentional and within retry limits
      if (!wasIntentional && currentTarget && retryCount.current < 5) {
        console.log(`⚠️ Unintentional close, attempting reconnect (${retryCount.current + 1}/5) in 2s...`);
        retryCount.current += 1;
        
        // Keep the target ID for the reconnect attempt
        setTimeout(() => {
          if (!peerRef.current && !isCreatingPeer.current) {
             createPeer(currentTarget, wasInitiator);
          }
        }, 2000);
      } else {
        if (!wasIntentional) {
            console.error('❌ Connection lost permanently (max retries exceeded or no target)');
            onError(new Error('Connection lost'));
        }
        onClose();
      }
    });

    peerRef.current = peer;

    // Process pending signals immediately after creation
    if (pendingSignals.current.length > 0) {
      console.log(`Processing ${pendingSignals.current.length} pending signals immediately after creation`);
      pendingSignals.current.forEach(signal => {
        try {
          peer.signal(signal);
        } catch (e) {
          console.error('Error processing pending signal:', e);
        }
      });
      pendingSignals.current = [];
    }
  }, [onSignal, onData, onConnect, onClose, onError]);

  const processSignal = useCallback((data: any) => {
    // If peer exists, signal it
    if (peerRef.current) {
      try {
        peerRef.current.signal(data);
      } catch (e) {
        console.error('Error signaling peer:', e);
      }
    } else if (isCreatingPeer.current) {
      // If we are in the middle of creating, queue it
      console.log('⏰ Peer still being created, queueing signal');
      pendingSignals.current.push(data);
    } else {
      console.warn('⚠️ Received signal but no peer exists and not creating one');
    }
  }, []);

  const destroyPeer = useCallback(() => {
    isIntentionalClose.current = true;
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    targetPeerId.current = null;
    isCreatingPeer.current = false;
    pendingSignals.current = [];
    setConnectionStatus('IDLE');
  }, []);

  const sendData = useCallback((data: any) => {
    if (peerRef.current && peerRef.current.connected) {
      return peerRef.current.write(data);
    } else {
      console.error('Cannot send data: Peer not connected');
      return false;
    }
  }, []);

  const waitForDrain = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (!peerRef.current) return resolve();
      const p = peerRef.current;
      
      const handler = () => {
        p.removeListener('drain', handler);
        resolve();
      };
      p.on('drain', handler);
    });
  }, []);

  // Connection monitoring
  useEffect(() => {
    if (connectionStatus !== 'CONNECTED' || !peerRef.current) return;

    console.log('💓 Starting heartbeat monitoring');
    lastHeartbeat.current = Date.now();

    const heartbeatInterval = setInterval(() => {
      if (peerRef.current && peerRef.current.connected) {
        try {
          peerRef.current.send('HEARTBEAT');
        } catch (e) {
          console.warn('Failed to send heartbeat', e);
        }
      }
    }, 3000);

    const timeoutInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - lastHeartbeat.current;
      if (timeSinceLastHeartbeat > 10000) {
        console.error(`❌ Connection timed out (last heartbeat ${timeSinceLastHeartbeat}ms ago)`);
        destroyPeer();
        onError(new Error('Connection timed out'));
      }
    }, 1000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(timeoutInterval);
    };
  }, [connectionStatus, destroyPeer, onError]);

  return {
    peer: peerRef.current,
    connectionStatus,
    targetPeerId: targetPeerId.current,
    createPeer,
    processSignal,
    destroyPeer,
    sendData,
    waitForDrain,
    isCreating: isCreatingPeer.current
  };
}
