// client/src/socket.js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001'); // Update to your backend URL in prod

export default socket;
