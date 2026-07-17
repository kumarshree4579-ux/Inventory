import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

const getSocket = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  if (!socketInstance || socketInstance.disconnected) {
    socketInstance = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  socketInstance?.disconnect();
  socketInstance = null;
};

export const useSocket = (eventHandlers = {}) => {
  const handlersRef = useRef(eventHandlers);
  handlersRef.current = eventHandlers;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const entries = Object.entries(handlersRef.current);
    entries.forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      entries.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, []);
};

export default getSocket;
