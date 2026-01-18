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
    if (socketRef.current) {
      socketRef.current.emit(type, payload);
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
