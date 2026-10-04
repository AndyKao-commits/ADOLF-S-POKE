import { io, Socket } from 'socket.io-client';
import type { RoomState } from './types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function onRoomState(cb: (state: RoomState) => void) {
  const s = getSocket();
  s.on('room:state', cb);
  return () => s.off('room:state', cb);
}
