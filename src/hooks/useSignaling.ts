import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'http://localhost:3001';

export type SignalPayload = {
  target: string;
  callerId: string;
  sdp?: any;
  candidate?: any;
};

export function useSignaling(roomId: string | null) {
  const socketRef = useRef<Socket | null>(null);

  // Using refs for callbacks to avoid dependency cycles if passed from outside
  const onUserConnected = useRef<((userId: string) => void) | null>(null);
  const onUserDisconnected = useRef<((userId: string) => void) | null>(null);
  const onOffer = useRef<((payload: SignalPayload) => void) | null>(null);
  const onAnswer = useRef<((payload: SignalPayload) => void) | null>(null);
  const onIceCandidate = useRef<((payload: SignalPayload) => void) | null>(null);

  const pendingQueue = useRef<{ type: string; payload: any }[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const socket = io(SIGNALING_SERVER, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔗 Connected to signaling server');
      socket.emit('join-room', roomId);
      
      // Flush pending queue
      if (pendingQueue.current.length > 0) {
        console.log(`📨 Flushing ${pendingQueue.current.length} pending signals`);
        pendingQueue.current.forEach(({ type, payload }) => {
          // Re-attempt sending (which will now have an ID)
          // We can't call sendSignal directly here easily due to closure/dep cycle if we put it in deps
          // But since we are inside useEffect, and sendSignal is outside...
          // Actually, we can just emit directly if we know the ID is ready.
          const id = socket.id;
          if (id) {
             const finalPayload = { ...payload, callerId: id };
             socket.emit(type, finalPayload);
          }
        });
        pendingQueue.current = [];
      }
    });

    socket.on('user-connected', (userId: string) => {
      console.log(`👤 User connected: ${userId}`);
      onUserConnected.current?.(userId);
    });

    socket.on('user-disconnected', (userId: string) => {
      console.log(`👤 User disconnected: ${userId}`);
      onUserDisconnected.current?.(userId);
    });

    socket.on('offer', (payload: SignalPayload) => {
      console.log(`📨 Received offer from ${payload.callerId}`);
      onOffer.current?.(payload);
    });

    socket.on('answer', (payload: SignalPayload) => {
      console.log(`📨 Received answer from ${payload.callerId}`);
      onAnswer.current?.(payload);
    });

    socket.on('ice-candidate', (payload: SignalPayload) => {
      onIceCandidate.current?.(payload);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from signaling server');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const sendSignal = useCallback((type: 'offer' | 'answer' | 'ice-candidate', payload: any) => {
    const socket = socketRef.current;
    if (socket && socket.id) {
      // Ensure callerId is attached
      const finalPayload = { ...payload, callerId: socket.id };
      socket.emit(type, finalPayload);
    } else {
      console.log('⏳ Socket not ready, queueing signal');
      pendingQueue.current.push({ type, payload });
    }
  }, []);

  const getSocketId = useCallback(() => socketRef.current?.id, []);

  // Setters for event handlers
  const setCallbacks = useCallback((callbacks: {
    onUserConnected?: (userId: string) => void;
    onUserDisconnected?: (userId: string) => void;
    onOffer?: (payload: SignalPayload) => void;
    onAnswer?: (payload: SignalPayload) => void;
    onIceCandidate?: (payload: SignalPayload) => void;
  }) => {
    if (callbacks.onUserConnected) onUserConnected.current = callbacks.onUserConnected;
    if (callbacks.onUserDisconnected) onUserDisconnected.current = callbacks.onUserDisconnected;
    if (callbacks.onOffer) onOffer.current = callbacks.onOffer;
    if (callbacks.onAnswer) onAnswer.current = callbacks.onAnswer;
    if (callbacks.onIceCandidate) onIceCandidate.current = callbacks.onIceCandidate;
  }, []);

  return {
    sendSignal,
    getSocketId,
    setCallbacks
  };
}
