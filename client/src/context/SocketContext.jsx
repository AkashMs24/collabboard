import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from './authStore';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');

    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socketRef}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
