const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
// Import the categories object instead of the flat list
const categories = require('./words'); // Ensure words.js is in the SAME directory

// --- Configuration ---
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const PORT = process.env.PORT || 3001;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 12;
const IMPOSTOR_ROUNDS = 3; // Number of clue rounds
const COUNTDOWN_DURATION = 5000; // 5 seconds (This was added later, but including for context)
// ---

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

const activeRooms = new Map();
const socketIdToRoom = new Map();

// --- Helper: Shuffle Array (Fisher-Yates) ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

// --- Vote Calculation Helper ---
function calculateVoteResults(room) {
    if (!room?.gameState?.votes) return null;
    const votes = room.gameState.votes; const voteCounts = {}; let maxVotes = 0; const mostVotedNicknames = [];
    for (const voter in votes) { const votedFor = votes[voter]; voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1; }
    for (const nickname in voteCounts) { if (voteCounts[nickname] > maxVotes) { maxVotes = voteCounts[nickname]; } }
    for (const nickname in voteCounts) { if (voteCounts[nickname] === maxVotes) { mostVotedNicknames.push(nickname); } }
    const impostorNickname = room.gameState.impostorNickname;
    const impostorWasCaught = mostVotedNicknames.length === 1 && mostVotedNicknames[0] === impostorNickname;
    const winner = impostorWasCaught ? 'players' : 'impostor';
    return { voteCounts, mostVotedNicknames, impostorNickname, impostorWasCaught, winner };
}


// --- Impostor Game Logic (UPDATED FOR CATEGORIES) ---
function startImpostorGame(roomCode, room) {
    if (!room || room.users.length < MIN_PLAYERS) {
        console.log(`[${roomCode}] Invalid start`);
        // Optionally emit an error back to the admin who tried to start
        const adminUser = room?.users.find(u => u.isAdmin);
        if (adminUser) {
            const adminSocket = io.sockets.sockets.get(adminUser.socketId);
            adminSocket?.emit('error', { message: `Cannot start game, need at least ${MIN_PLAYERS} players.` });
        }
        return;
    }

    const players = room.users;
    const impostorIndex = Math.floor(Math.random() * players.length);
    const impostor = players[impostorIndex];

    // --- Select Category and Word ---
    const categoryNames = Object.keys(categories);
    if (categoryNames.length === 0) { console.error("Word categories are empty!"); return; }
    const randomCategoryName = categoryNames[Math.floor(Math.random() * categoryNames.length)];
    const wordsInCategory = categories[randomCategoryName];
    if (!wordsInCategory || wordsInCategory.length === 0) { console.error(`Category "${randomCategoryName}" has no words!`); return; }
    const word = wordsInCategory[Math.floor(Math.random() * wordsInCategory.length)];
    // --- End Selection ---

    // --- Turn order includes everyone now ---
    const shuffledTurnOrder = shuffleArray(players.map(p => p.nickname));

    // --- Initialize Clues Map ---
    const initialClues = {};
    players.forEach(p => { initialClues[p.nickname] = []; }); // Array to hold clues per round

    // --- Update Game State with Category ---
    room.gameState = {
        mode: 'impostor',
        // Removed word from global state
        category: randomCategoryName, // Store the category name
        impostorNickname: impostor.nickname,
        clues: initialClues, // { nickname: [clueR1, clueR2, clueR3] }
        votes: {}, // { voterNickname: votedNickname }
        results: null, // To store vote results later
        phase: `clue_giving_round_1`, // Start with round 1 phase
        currentRound: 1,
        turnOrder: shuffledTurnOrder,
        currentTurnIndex: 0,
        currentTurnNickname: shuffledTurnOrder[0],
    };
    console.log(`[${roomCode}] Impostor Started. Category: ${randomCategoryName}, Impostor: ${impostor.nickname}, Round: 1, Turn: ${room.gameState.currentTurnNickname}`);

    // --- Assign roles individually (send category to all, word only to innocent) ---
    players.forEach(player => {
        const socket = io.sockets.sockets.get(player.socketId);
        if (socket) {
            const isImpostor = player.socketId === impostor.socketId;
            socket.emit('game_role_assigned', {
                role: isImpostor ? 'impostor' : 'innocent', // Use innocent consistently
                category: randomCategoryName,               // Send category to EVERYONE
                word: isImpostor ? null : word,             // Send word ONLY to innocents
                message: isImpostor ? 'You are the Impostor! Try to guess the word from the category and clues.' : null
            });
        }
    });
    // --- End Role Assignment ---

    // Notify all players with the initial game state (including category)
    // This happens slightly after role assignment
    io.to(roomCode).emit('game_state_update', {
        mode: room.gameState.mode,
        phase: room.gameState.phase,
        category: room.gameState.category, // Send category
        players: room.users.map(u => ({nickname: u.nickname, isAdmin: u.isAdmin})),
        currentTurnNickname: room.gameState.currentTurnNickname,
        clues: room.gameState.clues,
        currentRound: room.gameState.currentRound, // Send current round
        // Do not send turnOrder or full clues map if not needed initially by all
    });
}

// --- Helper Function to Leave Room ---
const handleLeave = (socket) => {
    if (!socket) return; const socketId = socket.id; const roomCode = socketIdToRoom.get(socketId); if (!roomCode) return;
    const room = activeRooms.get(roomCode); if (!room) { console.warn(`Leave Error: Room ${roomCode} not found.`); socketIdToRoom.delete(socketId); return; }
    const userLeaving = room.users.find(user => user.socketId === socketId); if (!userLeaving) { console.warn(`Leave Error: User ${socketId} not found in room ${roomCode}.`); socketIdToRoom.delete(socketId); return; }
    const nickname = userLeaving.nickname; const isAdminLeaving = userLeaving.isAdmin; const wasGameInProgress = !!room.gameState;
    socket.leave(roomCode); socketIdToRoom.delete(socketId); console.log(`${nickname} (${socketId}) leaving room ${roomCode}.`);
    const remainingUsers = room.users.filter(user => user.socketId !== socketId); const remainingUserCount = remainingUsers.length;
    if (isAdminLeaving || remainingUserCount === 0) { activeRooms.delete(roomCode); console.log(`Room ${roomCode} deleted.`); io.to(roomCode).emit('room_deleted', { message: `Room deleted: ${isAdminLeaving ? 'Admin' : 'Last user'} left.` }); }
    else { room.users = remainingUsers; console.log(`Remaining users in ${roomCode}: ${remainingUserCount}`); io.to(roomCode).emit('user_left', { nickname, users: room.users });
        if (wasGameInProgress) { console.log(`Player ${nickname} left during game in room ${roomCode}. Ending game.`); room.gameState = null; io.to(roomCode).emit('game_ended', { message: `${nickname} left, the game has ended.` }); }
    } console.log(`Active rooms: ${Array.from(activeRooms.keys())}`);
};


io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- Lobby Events ---
  socket.on('create_room', ({ roomCode, nickname }) => {
    if (!nickname || !roomCode) return socket.emit('error', { message: 'Nickname/Code required.' });
    if (activeRooms.has(roomCode)) return socket.emit('error', { message: 'Room code exists.' });
    const newUser = { nickname, isAdmin: true, socketId: socket.id };
    activeRooms.set(roomCode, { admin: nickname, users: [newUser], gameState: null });
    socketIdToRoom.set(socket.id, roomCode);
    socket.join(roomCode);
    console.log(`Room ${roomCode} created by ${nickname} (${socket.id})`);
    console.log(`[Server] Emitting 'room_created' to socket ${socket.id} for room ${roomCode}`); // Keep this log
    socket.emit('room_created', {
        roomCode,
        users: activeRooms.get(roomCode).users,
        isAdmin: true
    });
  });
  socket.on('join_room', ({ roomCode, nickname }) => {
    if (!nickname || !roomCode) return socket.emit('error', { message: 'Nickname/Code required.' });
    const room = activeRooms.get(roomCode); if (!room) return socket.emit('error', { message: 'Room not found.' });
    if (room.users.length >= MAX_PLAYERS) return socket.emit('error', { message: `Room full (max ${MAX_PLAYERS}).` });
    if (room.gameState) return socket.emit('error', { message: 'Game already in progress.'});
    if (room.users.some(user => user.nickname === nickname)) return socket.emit('error', { message: `Nickname "${nickname}" taken.` });
    const newUser = { nickname, isAdmin: false, socketId: socket.id }; room.users.push(newUser);
    socketIdToRoom.set(socket.id, roomCode); socket.join(roomCode);
    console.log(`${nickname} (${socket.id}) joined room ${roomCode} (${room.users.length}/${MAX_PLAYERS})`);
    io.to(roomCode).emit('user_joined', { roomCode, nickname, users: room.users });
  });
  // Includes countdown timeout
  socket.on('start_game', ({ roomCode, mode }) => {
    const room = activeRooms.get(roomCode); if (!room) return socket.emit('error', { message: 'Room not found.' });
    const reqUser = room.users.find(u=>u.socketId===socket.id); if (!reqUser || !reqUser.isAdmin) return socket.emit('error', { message: 'Only admin can start.' });
    if (room.users.length < MIN_PLAYERS) return socket.emit('error', { message: `Need ${MIN_PLAYERS}+ players.` });
    if (!mode) return socket.emit('error', { message: `Mode must be selected.` });
    if (room.gameState) return socket.emit('error', { message: `Game already started.` });

    io.to(roomCode).emit('game_starting', { mode });
    console.log(`[Room ${roomCode}] Game starting sequence initiated for mode "${mode}". Countdown begins.`);

    setTimeout(() => {
        const currentRoom = activeRooms.get(roomCode);
        if (!currentRoom) { console.log(`[Room ${roomCode}] Game start cancelled - room deleted during countdown.`); return; }
        if (currentRoom.users.length < MIN_PLAYERS) { console.log(`[Room ${roomCode}] Game start cancelled - insufficient players after countdown.`); io.to(roomCode).emit('game_ended', { message: `Game cancelled - not enough players.` }); return; }
        if (currentRoom.gameState) { console.log(`[Room ${roomCode}] Game already seems to be in progress after countdown.`); return; }

        console.log(`[Room ${roomCode}] Countdown finished. Starting game logic for "${mode}".`);
        if (mode === 'impostor') { startImpostorGame(roomCode, currentRoom); }
        else { console.log(`Unknown/unimplemented game mode: ${mode}`); io.to(roomCode).emit('game_ended', { message: `Mode "${mode}" not implemented or unknown.` }); }
    }, COUNTDOWN_DURATION);
  });


  // --- Impostor Game Events ---
  socket.on('submit_clue', ({ roomCode, clue }) => {
      const room = activeRooms.get(roomCode); const user = room?.users.find(u => u.socketId === socket.id);
      if (!room || !user || !room.gameState || room.gameState.mode !== 'impostor') return socket.emit('error', { message: 'Not in impostor game.' });
      const currentRound = room.gameState.currentRound; if (room.gameState.phase !== `clue_giving_round_${currentRound}`) return socket.emit('error', { message: 'Not clue giving phase.' });
      if (user.nickname !== room.gameState.currentTurnNickname) return socket.emit('error', { message: 'Not your turn.' });
      if (room.gameState.clues[user.nickname]?.[currentRound - 1] !== undefined) return socket.emit('error', { message: `Already submitted clue for round ${currentRound}.` });
      if (!clue || clue.trim().length === 0 || clue.length > 50) return socket.emit('error', { message: 'Invalid clue (1-50 chars).' });
      const sanitizedClue = clue.trim(); if (!room.gameState.clues[user.nickname]) room.gameState.clues[user.nickname] = [];
      room.gameState.clues[user.nickname][currentRound - 1] = sanitizedClue; console.log(`[Room ${roomCode}] R${currentRound} Clue from ${user.nickname}: ${sanitizedClue}`);
      room.gameState.currentTurnIndex++; const nextTurnIndex = room.gameState.currentTurnIndex; const turnOrder = room.gameState.turnOrder; const totalPlayers = room.users.length;
      if (nextTurnIndex >= totalPlayers) { const nextRound = currentRound + 1; if (nextRound > IMPOSTOR_ROUNDS) { console.log(`[Room ${roomCode}] All ${IMPOSTOR_ROUNDS} rounds complete. Moving to voting.`); room.gameState.phase = 'voting'; room.gameState.currentTurnIndex = 0; room.gameState.currentTurnNickname = null; room.gameState.currentRound = 0; } else { console.log(`[Room ${roomCode}] Round ${currentRound} complete. Starting Round ${nextRound}.`); room.gameState.phase = `clue_giving_round_${nextRound}`; room.gameState.currentRound = nextRound; room.gameState.currentTurnIndex = 0; room.gameState.currentTurnNickname = turnOrder[0]; } }
      else { room.gameState.currentTurnNickname = turnOrder[nextTurnIndex]; }
      io.to(roomCode).emit('game_state_update', { ...room.gameState, word: null, results: null, players: room.users.map(u => ({nickname: u.nickname, isAdmin: u.isAdmin})) });
  });

  socket.on('submit_vote', ({ roomCode, votedNickname }) => {
      const room = activeRooms.get(roomCode); const user = room?.users.find(u => u.socketId === socket.id);
      if (!room || !user || !room.gameState || room.gameState.mode !== 'impostor' || room.gameState.phase !== 'voting') return socket.emit('error', { message: 'Cannot vote now.' });
      const voterNickname = user.nickname; if (room.gameState.votes[voterNickname]) return socket.emit('error', { message: 'You have already voted.' });
      if (!room.users.some(p => p.nickname === votedNickname)) return socket.emit('error', { message: 'Invalid vote target.' });
      room.gameState.votes[voterNickname] = votedNickname; console.log(`[Room ${roomCode}] Vote: ${voterNickname} -> ${votedNickname}`);
      const expectedVotes = room.users.length; const currentVotes = Object.keys(room.gameState.votes).length; console.log(`[Room ${roomCode}] Votes: ${currentVotes}/${expectedVotes}`);
      if (currentVotes >= expectedVotes) { console.log(`[Room ${roomCode}] All votes in. Calculating results.`); const results = calculateVoteResults(room); room.gameState.results = results; room.gameState.phase = 'reveal'; io.to(roomCode).emit('game_state_update', { ...room.gameState, word: null, players: room.users.map(u => ({nickname: u.nickname, isAdmin: u.isAdmin})) }); console.log(`[Room ${roomCode}] Results calculated. Impostor Caught: ${results?.impostorWasCaught}, Winner: ${results?.winner}`); }
      else { io.to(roomCode).emit('game_state_update', { phase: 'voting', votes: room.gameState.votes }); }
  });

  socket.on('request_return_to_lobby', ({ roomCode }) => {
      const room = activeRooms.get(roomCode); const user = room?.users.find(u => u.socketId === socket.id);
      if (room && user && (!room.gameState || room.gameState.phase === 'reveal')) { console.log(`[Room ${roomCode}] ${user.nickname} requested return to lobby.`); if (room.gameState?.phase === 'reveal') { room.gameState = null; } socket.emit('game_ended', { message: 'Returned to lobby.' }); }
      else { socket.emit('error', { message: 'Cannot return to lobby now.' }); }
  });

  // --- General Room Events ---
  socket.on('leave_room', () => { handleLeave(socket); });
  socket.on('disconnect', (reason) => { console.log(`Disconnect: ${socket.id}, Reason: ${reason}`); handleLeave(socket); });
});

app.get('/rooms', (req, res) => {
    const roomsData=Array.from(activeRooms.entries()).map(([code, data])=>({ code:code, admin:data.admin, userCount:data.users.length, mode:data.gameState?.mode||null, phase:data.gameState?.phase||null }));
    res.json({rooms:roomsData});
});
server.listen(PORT, () => { console.log(`Server running on ${PORT}...`); });