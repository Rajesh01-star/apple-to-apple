import { useState, useCallback, useEffect, useRef } from 'react';
import { useSignaling } from './useSignaling';
import { usePeerConnection } from './usePeerConnection';
import { useFileTransfer, TransferStatus } from './useFileTransfer';

export function useWebRTC() {
  const [portalId, setPortalId] = useState<string | null>(null);
  
  // 1. Signaling Hook
  const { sendSignal, getSocketId, setCallbacks } = useSignaling(portalId);

  // 2. State & Callbacks for Peer Connection
  const [isConnected, setIsConnected] = useState(false);

  // Ref pattern to allow circular dependency between hooks
  // useFileTransfer needs sendData (from peer hook)
  // usePeerConnection needs onData (which calls handleReceivedData from transfer hook)
  const handleReceivedDataRef = useRef<((data: any) => void) | null>(null);

  const onData = useCallback((data: any) => {
    if (handleReceivedDataRef.current) {
      handleReceivedDataRef.current(data);
    }
  }, []);

  const onConnect = useCallback(() => {
    // We'll update the main status via the transfer hook's setter
    setTransferStatus('CONNECTED');
    setIsConnected(true);
  }, []);

  const onClose = useCallback(() => {
    setTransferStatus('IDLE');
    setIsConnected(false);
  }, []);

  const onError = useCallback((err: Error) => {
    setTransferStatus('ERROR');
  }, []);

  // 3. Peer Connection Hook
  const { 
    createPeer, 
    processSignal, 
    destroyPeer, 
    sendData, 
    targetPeerId, 
    isCreating,
    peer 
  } = usePeerConnection({
    onSignal: (type, payload) => sendSignal(type, payload),
    onData: onData,
    onConnect,
    onClose,
    onError
  });

  // 4. File Transfer Hook
  const { 
    transferStatus, 
    setTransferStatus, 
    progress, 
    receivedFiles, 
    sendFile, 
    handleReceivedData,
    resetTransferState
  } = useFileTransfer({
    sendData,
    isConnected
  });

  // Update ref when handleReceivedData changes
  useEffect(() => {
    handleReceivedDataRef.current = handleReceivedData;
  }, [handleReceivedData]);

  // 5. Wiring Signaling Events to Peer Logic
  // Sync refs for signaling callbacks to avoid stale closures
  const peerRef = useRef(peer);
  const isCreatingRef = useRef(isCreating);

  useEffect(() => {
    peerRef.current = peer;
    isCreatingRef.current = isCreating;
  }, [peer, isCreating]);

  // 5. Wiring Signaling Events to Peer Logic
  useEffect(() => {
    setCallbacks({
      onUserConnected: (userId) => {
        const myId = getSocketId();
        if (!myId) return;

        console.log(`User connected: ${userId}, My ID: ${myId}`);
        const shouldInitiate = myId < userId;
        console.log(`${shouldInitiate ? '✅ I will initiate' : '⏳ I will wait'}`);

        // Only create peer if we don't have one
        // Use refs to check current state without re-binding callbacks
        if (!peerRef.current && !isCreatingRef.current) {
          createPeer(userId, shouldInitiate);
        }
      },
      onUserDisconnected: (userId) => {
        if (targetPeerId === userId) {
          console.log('Target peer disconnected, resetting...');
          destroyPeer();
          setTransferStatus('WAITING_FOR_PEER');
          setIsConnected(false);
        }
      },
      onOffer: (payload) => {
        // If we receive an offer and don't have a peer, create one (receiver)
        if (!peerRef.current && !isCreatingRef.current) {
          createPeer(payload.callerId, false);
        }
        processSignal(payload.sdp);
      },
      onAnswer: (payload) => {
        processSignal(payload.sdp);
      },
      onIceCandidate: (payload) => {
        processSignal(payload.candidate);
      }
    });
  }, [setCallbacks, createPeer, processSignal, destroyPeer, getSocketId, targetPeerId, setTransferStatus]);

  const initialize = useCallback((id: string) => {
    setPortalId(id);
    setTransferStatus('WAITING_FOR_PEER');
    setIsConnected(false);
    
    // Cleanup any existing state
    destroyPeer();
    resetTransferState();
  }, [destroyPeer, resetTransferState, setTransferStatus]);

  return {
    status: transferStatus,
    progress,
    receivedFiles,
    initialize,
    sendFile,
    portalId,
    isConnected
  };
}
