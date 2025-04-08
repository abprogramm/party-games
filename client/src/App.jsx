import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import LobbyEntry from './components/LobbyEntry';
import LobbyRoom from './components/LobbyRoom';
import CountdownScreen from './components/CountdownScreen';
import RoleRevealScreen from './components/RoleRevealScreen';
import ImpostorGame from './components/ImpostorGame';
import "./index.css";

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
const socket = io(SOCKET_SERVER_URL, { autoConnect: false });
const COUNTDOWN_START_VALUE = 5;
const ROLE_REVEAL_DURATION_MS = 3500;

function App() {
  // --- Core State ---
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notifications, setNotifications] = useState([]);

  // --- Game State ---
  const [gameState, setGameState] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_START_VALUE);
  const [isShowingRole, setIsShowingRole] = useState(false);

  // --- Refs ---
  const countdownIntervalRef = useRef(null);
  const roleRevealTimeoutRef = useRef(null);
  const nicknameRef = useRef(nickname);
  useEffect(() => { nicknameRef.current = nickname; }, [nickname]);

  // --- Notifications ---
  const showNotification = useCallback((message, type = "info") => {
    if (!message || typeof message !== 'string' || message.trim() === '') { console.warn("Attempted to show empty notification"); return; }
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { message: message.trim(), type, id }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 5000);
  }, []); // Stable

  // --- Helper: Clear All Game/Transition Timers ---
  const clearAllTimers = useCallback(() => {
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (roleRevealTimeoutRef.current) { clearTimeout(roleRevealTimeoutRef.current); roleRevealTimeoutRef.current = null; }
  }, []); // Stable

  // --- State Reset ---
  const resetRoomState = useCallback(() => {
    console.log("Resetting room and game state...");
    setRoomCode(""); setUsers([]); setIsInRoom(false); setIsAdmin(false);
    setErrorMessage(""); setGameState(null); setPlayerRole(null);
    setIsCountingDown(false); setIsShowingRole(false);
    clearAllTimers();
  }, [clearAllTimers]); // Dependency on stable clearAllTimers

  const resetGameState = useCallback(() => {
      console.log("Resetting game state only...");
      setGameState(null); setPlayerRole(null);
      setIsCountingDown(false); setIsShowingRole(false);
      clearAllTimers();
  }, [clearAllTimers]); // Dependency on stable clearAllTimers


  // --- Socket Listeners Effect ---
  useEffect(() => {
    if (!isConnected && !socket.connecting) { console.log("Effect: Attempting socket connect..."); socket.connect(); }
    console.log(`Effect: Connect/Listeners setup. Status: ${isConnected}, InRoom: ${isInRoom}, Room: ${roomCode}`);

    // --- Listeners ---
    const onConnect = () => { console.log("Socket connected:", socket.id); setIsConnected(true); setErrorMessage(""); };
    const onDisconnect = (reason) => { console.log("Socket disconnected:", reason); setIsConnected(false); clearAllTimers(); if (reason === 'io server disconnect' || reason === 'io client disconnect') { showNotification("Disconnected.", "error"); resetRoomState(); } else { showNotification("Connection lost.", "error"); } };
    const onError = ({ message }) => { const errorMsg = message || "An unknown error occurred."; console.error("Error from server:", errorMsg); setErrorMessage(errorMsg); showNotification(`Error: ${errorMsg}`, 'error'); setIsCountingDown(false); setIsShowingRole(false); clearAllTimers(); };

    // *** ADDED LOGS TO onRoomCreated ***
    const onRoomCreated = ({ roomCode: rc, users: us, isAdmin: adm }) => {
        console.log(`>>> Event: room_created received for room ${rc}`, {users: us, isAdmin: adm});
        // Use a ref or local variable to check current state if needed, but direct state check is usually fine
        setIsInRoom(currentIsInRoom => {
            console.log(`>>> Event: current isInRoom state is: ${currentIsInRoom}`);
            if (!currentIsInRoom) {
                console.log(`>>> INSIDE if(!isInRoom) check. Proceeding to set state for room ${rc}.`);
                setRoomCode(rc);
                setUsers(us);
                setIsAdmin(adm);
                resetGameState(); // Reset game things first
                setErrorMessage(""); // Clear errors specifically
                if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(rc).then(() => showNotification(`Room Code ${rc} copied!`, "success")).catch(() => showNotification(`Created Room: ${rc}`, "info")); } else { showNotification(`Created Room: ${rc}`, "info"); }
                console.log(`>>> State setting calls completed for room ${rc}. Returning true for setIsInRoom.`);
                return true; // This is the crucial update for isInRoom
            } else {
                 console.warn(`>>> Received room_created event but client state isInRoom is already true. Ignoring.`);
                 return true; // Keep it true if it was already true
            }
        });
    };
    // *** END ADDED LOGS ***

    const onUserJoined = ({ roomCode: rc, nickname: nick, users: us }) => { console.log(`Event: user_joined ${nick} to ${rc}.`); if (nick === nicknameRef.current && !isInRoom) { setRoomCode(rc); setUsers(us); setIsAdmin(false); setIsInRoom(true); resetGameState(); setErrorMessage(""); showNotification(`Joined room: ${rc}`, "success"); } else if (isInRoom && roomCode === rc && nick !== nicknameRef.current) { setUsers(us); showNotification(`${nick} joined!`, "success"); }};
    const onUserLeft = ({ nickname: nick, users: us }) => { if (isInRoom) { setUsers(us); if (nick !== nicknameRef.current) showNotification(`${nick} left.`, "error"); if(isCountingDown || isShowingRole){ console.log("Start cancelled due to player leaving."); setIsCountingDown(false); setIsShowingRole(false); clearAllTimers(); showNotification("Start cancelled - player left.", "error"); resetGameState();}} };
    const onRoomDeleted = ({ message }) => { if (isInRoom) { showNotification(message || "The room was deleted.", "error"); clearAllTimers(); resetRoomState(); } };
    const onGameStarting = ({ mode }) => { console.log(`Event: game_starting - Mode: ${mode}.`); showNotification(`Starting ${mode}...`, "info"); setErrorMessage(''); setIsCountingDown(true); setIsShowingRole(false); setCountdownValue(COUNTDOWN_START_VALUE); clearAllTimers(); countdownIntervalRef.current = setInterval(() => { setCountdownValue(currentValue => { if (currentValue <= 1) { clearAllTimers(); return 0; } return currentValue - 1; }); }, 1000); };
    const onGameRoleAssigned = (roleData) => { console.log(`Event: game_role_assigned`); setPlayerRole(roleData); setIsCountingDown(false); clearAllTimers(); setIsShowingRole(true); roleRevealTimeoutRef.current = setTimeout(() => { console.log("Role reveal duration over."); setIsShowingRole(false); }, ROLE_REVEAL_DURATION_MS); };
    const onGameStateUpdate = (newGameState) => { console.log(`Event: game_state_update`); setGameState(prev => ({ ...(prev || {}), ...newGameState })); if ((isCountingDown || isShowingRole) && newGameState?.phase) { console.log("Game state update received, ensuring countdown/reveal stops."); setIsCountingDown(false); setIsShowingRole(false); clearAllTimers(); }};
    const onGameEnded = ({ message }) => { console.log(`Event: game_ended`); showNotification(message || "Game Ended", "info"); setIsCountingDown(false); setIsShowingRole(false); clearAllTimers(); resetGameState(); };

    // Register listeners...
    socket.on('connect', onConnect); socket.on('disconnect', onDisconnect); socket.on('error', onError);
    socket.on('room_created', onRoomCreated); socket.on('user_joined', onUserJoined); socket.on('user_left', onUserLeft); socket.on('room_deleted', onRoomDeleted);
    socket.on('game_starting', onGameStarting); socket.on('game_role_assigned', onGameRoleAssigned);
    socket.on('game_state_update', onGameStateUpdate); socket.on('game_ended', onGameEnded);

    // Cleanup listeners AND TIMERS
    return () => {
      console.log("Effect cleanup: Removing listeners and timers.");
      clearAllTimers();
      socket.off('connect'); socket.off('disconnect'); socket.off('error'); socket.off('room_created'); socket.off('user_joined'); socket.off('user_left'); socket.off('room_deleted'); socket.off('game_starting'); socket.off('game_role_assigned'); socket.off('game_state_update'); socket.off('game_ended');
    };
    // *** SIMPLIFIED DEPENDENCIES ***
  }, [isConnected, isInRoom, roomCode, resetRoomState, resetGameState, showNotification, clearAllTimers]); // Removed isCountingDown, isShowingRole


  // --- Actions ---
  const handleCreateRoom = useCallback(() => {
      const trimmedNickname = nickname.trim(); if (!trimmedNickname) { setErrorMessage("Please enter a nickname."); return null; }
      const newRoomCode = generateRoomCode(); setErrorMessage("");
      socket.emit('create_room', { roomCode: newRoomCode, nickname: trimmedNickname });
      return newRoomCode;
  }, [nickname]);

  const handleJoinRoom = useCallback((codeToJoin) => {
     const nicknameToUse = nickname.trim();
     if (!nicknameToUse) { setErrorMessage("Please enter a nickname."); return; } if (!codeToJoin) { setErrorMessage("Please enter a room code."); return; }
     setErrorMessage("");
     socket.emit("join_room", { roomCode: codeToJoin.trim().toUpperCase(), nickname: nicknameToUse });
  }, [nickname]);

  const handleLeaveRoom = useCallback(() => { console.log("Emitting leave_room (Full Leave)"); socket.emit("leave_room"); showNotification("You have left the room.", "info"); resetRoomState(); }, [resetRoomState, showNotification]);
  const handleStartGame = useCallback((modeId) => { console.log(`Attempting to start game with mode: ${modeId}`); setErrorMessage(""); socket.emit('start_game', { roomCode, mode: modeId }); }, [roomCode]);
  const handleReturnToLobby = useCallback(() => { console.log("Requesting return to lobby..."); socket.emit('request_return_to_lobby', { roomCode }); }, [roomCode]);


  // --- Render Logic ---
  const renderContent = () => {
    if (!isConnected && !errorMessage) { return <div className="loading">Connecting...</div>; }
    // Always show Entry screen if not in a room, allows showing errors correctly
    if (!isInRoom) { return ( <LobbyEntry nickname={nickname} onNicknameChange={setNickname} onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} currentError={errorMessage} /> ); }

    // If in a room, check transition states first
    if (isCountingDown) { return <CountdownScreen countdownValue={countdownValue} />; }
    if (isShowingRole) { return <RoleRevealScreen playerRole={playerRole} />; }

    // If not transitioning, show game or lobby
    if (gameState && gameState.mode === 'impostor') { return ( <ImpostorGame socket={socket} roomCode={roomCode} nickname={nickname} isAdmin={isAdmin} users={users} gameState={gameState} playerRole={playerRole} onLeave={handleLeaveRoom} onReturnToLobby={handleReturnToLobby} /> ); }
    else { return ( <LobbyRoom roomCode={roomCode} nickname={nickname} users={users} isAdmin={isAdmin} onLeaveRoom={handleLeaveRoom} onStartGame={handleStartGame} currentError={errorMessage} /> ); }
  };


  // --- Return App Structure ---
  return (
    <div className="app-container">
        <div className="notifications-container"> {notifications.map((n)=>(<div key={n.id} className={`notification ${n.type}`}>{n.message}</div>))} </div>
        {renderContent()}
    </div>
  );
}

const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
export default App;