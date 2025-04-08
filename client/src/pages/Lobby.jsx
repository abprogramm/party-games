// client/src/pages/Lobby.jsx
import { useState, useEffect } from "react";
import socket from "../socket";
import './Lobby.css';  // Import CSS file for styling

export default function Lobby({ onJoin }) {
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState('');
  const [messages, setMessages] = useState([]);
  const [role, setRole] = useState('');
  const [gameCreated, setGameCreated] = useState(false);

  // Listen for the "user-joined" event from backend
  useEffect(() => {
    socket.on('user-joined', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Listen for room data (roles)
    socket.on('room-data', (roomData) => {
      const player = roomData.players.find(p => p.socketId === socket.id);
      if (player) {
        setRole(player.socketId === roomData.impostor ? 'Impostor' : 'Regular Player');
      }
    });

    return () => {
      socket.off('user-joined');
      socket.off('room-data');
    };
  }, []);

  const handleJoin = () => {
    if (!roomCode || !nickname) return;
    socket.emit('join-room', { roomCode, nickname });
    onJoin(roomCode, nickname);
  };

  const handleCreateRoom = () => {
    if (!nickname) return;
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(newRoomCode);
    socket.emit('create-room', { roomCode: newRoomCode, nickname });
    setGameCreated(true);
  };

  const handleSelectMode = (selectedMode) => {
    setMode(selectedMode);
    // Proceed to start game logic
  };

  return (
    <div className="lobby-container">
      <div className="lobby">
        <h1 className="lobby-title">🎉 Join a Party Game</h1>
        
        {!gameCreated ? (
          <>
            <input
              type="text"
              className="input-field"
              placeholder="Nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <div className="button-group">
              <button onClick={handleCreateRoom} className="button">Create Room</button>
              <button onClick={handleJoin} className="button">Join Room</button>
            </div>
          </>
        ) : (
          <>
            <div className="room-info">
              <p>Room Code: {roomCode}</p>
              <p>Your role: {role}</p>
            </div>
            <div className="select-mode">
              <p>Select Game Mode:</p>
              <button onClick={() => handleSelectMode('Impostor')} className="button">Impostor</button>
              <button onClick={() => handleSelectMode('Spy')} className="button">Spy</button>
              <button onClick={() => handleSelectMode('Wavelength')} className="button">Wavelength</button>
              <button onClick={() => handleSelectMode('WhatsTheQuestion')} className="button">What's the Question</button>
            </div>
          </>
        )}

        <div className="messages">
          {messages.map((msg, idx) => (
            <p key={idx}>{msg}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
