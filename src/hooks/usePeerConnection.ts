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
      onConnect();

      // Process pending signals
      if (pendingSignals.current.length > 0) {
        console.log(`Processing ${pendingSignals.current.length} pending signals`);
        pendingSignals.current.forEach(signal => {
          try {
            peer.signal(signal);
          } catch (e) {
            console.error('Error processing pending signal:', e);
          }
        });
        pendingSignals.current = [];
      }
    });

    peer.on('data', (data) => {
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
      setConnectionStatus('IDLE');
      peerRef.current = null;
      targetPeerId.current = null;
      isCreatingPeer.current = false;
      onClose();
    });

    peerRef.current = peer;
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
      peerRef.current.send(data);
    } else {
      console.error('Cannot send data: Peer not connected');
    }
  }, []);

  return {
    peer: peerRef.current,
    connectionStatus,
    targetPeerId: targetPeerId.current,
    createPeer,
    processSignal,
    destroyPeer,
    sendData,
    isCreating: isCreatingPeer.current
  };
}
