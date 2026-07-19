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

    // Use stable wrapper functions that always call the latest handler via ref
    const wrappers = {};
    Object.keys(handlersRef.current).forEach((event) => {
      wrappers[event] = (...args) => handlersRef.current[event]?.(...args);
      socket.on(event, wrappers[event]);
    });

    return () => {
      Object.entries(wrappers).forEach(([event, fn]) => socket.off(event, fn));
    };
  }, []);
};

export default getSocket;
