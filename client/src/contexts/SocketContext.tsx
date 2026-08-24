/**
 * Single WebSocket connection context — replaces 4 separate Socket.IO connections.
 *
 * Every component that needs real-time (chat, captions, streaming, reactions)
 * uses this single shared connection via useSocket().
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE } from '../utils/constants';

type MessageHandler = (data: any) => void;

interface SocketContextValue {
  connected: boolean;
  send: (data: object) => void;
  sendBinary: (data: ArrayBuffer | Blob) => void;
  on: (type: string, handler: MessageHandler) => () => void;
  joinRoom: (roomId: string) => void;
}

const SocketContext = createContext<SocketContextValue>({
  connected: false,
  send: () => {},
  sendBinary: () => {},
  on: () => () => {},
  joinRoom: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const pendingRooms = useRef<Set<string>>(new Set());

  const getWsUrl = useCallback(() => {
    const base = API_BASE.replace(/^http/, 'ws');
    return `${base}/ws`;
  }, []);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('🔌 WebSocket connected');
      // Re-join any rooms
      for (const roomId of pendingRooms.current) {
        ws.send(JSON.stringify({ type: 'room:join', roomId }));
      }
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data);
        const typeHandlers = handlersRef.current.get(msg.type);
        if (typeHandlers) {
          for (const handler of typeHandlers) {
            handler(msg);
          }
        }
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Auto-reconnect after 2s
      reconnectTimer.current = setTimeout(connectWs, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [getWsUrl]);

  useEffect(() => {
    connectWs();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connectWs]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendBinary = useCallback((data: ArrayBuffer | Blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const on = useCallback((type: string, handler: MessageHandler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);
    // Return cleanup function
    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    pendingRooms.current.add(roomId);
    send({ type: 'room:join', roomId });
  }, [send]);

  return (
    <SocketContext.Provider value={{ connected, send, sendBinary, on, joinRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
