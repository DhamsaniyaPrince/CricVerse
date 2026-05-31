import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { updateLiveScore, appendCommentary, appendWagonPoint } from '../store/slices/matchSlice';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const useSocket = (matchId?: string) => {
  const dispatch = useDispatch();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!matchId) return;

    // Connect to Socket.io Server
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      upgrade: false
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`Connected to live scoring server: ${socket.id}`);
      // Join the room for the specific match
      socket.emit('join_match_room', matchId);
    });

    // Real-time live score updates
    socket.on('match:update', (data) => {
      console.log('Socket match score update received:', data);
      dispatch(updateLiveScore(data));
    });

    // Real-time commentary append
    socket.on('match:commentary', (commentary) => {
      console.log('Socket commentary update received:', commentary);
      dispatch(appendCommentary(commentary));
    });

    // Real-time wagon wheel update
    socket.on('match:wagonwheel', (point) => {
      console.log('Socket wagon wheel update received:', point);
      dispatch(appendWagonPoint(point));
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from live scoring server');
    });

    // Cleanup on unmount
    return () => {
      socket.emit('leave_match_room', matchId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [matchId, dispatch]);

  return socketRef.current;
};
