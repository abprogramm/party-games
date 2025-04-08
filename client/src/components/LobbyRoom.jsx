import React, { useState, useEffect } from 'react';

const MIN_PLAYERS_TO_START = 2;
const MAX_PLAYERS = 12; // Define here for JSX

// Added Icons
const GAME_MODES = [
    { id: 'impostor', name: 'Impostor', description: 'Everyone gets a word except the Impostor. Give clues to find them!', icon: '🕵️' },
    { id: 'spy', name: 'Spy', description: 'Everyone gets a location/item except the Spy. Ask yes/no questions to find them!', icon: '🕶️' },
];


// Accept onClick prop
function LobbyRoom({ roomCode, nickname, users, isAdmin, onLeaveRoom, onStartGame, currentError, onClick }) {
    const [showModeSelection, setShowModeSelection] = useState(false);
    const [lobbyError, setLobbyError] = useState('');
    const [isStarting, setIsStarting] = useState(false);

    const handleShowModeSelection = () => {
        setLobbyError('');
        if (users.length < MIN_PLAYERS_TO_START) { setLobbyError(`Need at least ${MIN_PLAYERS_TO_START} players.`); }
        else { setShowModeSelection(true); }
    };
    const handleSelectMode = (modeId) => {
        setShowModeSelection(false); setLobbyError(''); setIsStarting(true);
        onStartGame(modeId);
        setTimeout(() => setIsStarting(false), 3000);
    };
    useEffect(() => { if (currentError) { setLobbyError(''); setIsStarting(false); } }, [currentError]);
    useEffect(() => { setIsStarting(false); }, [users]);

    return (
        // Add onClick handler
        <div className="content lobby-room-view" onClick={onClick} role="button" tabIndex="0">
             <h2>Room Code: <span className="highlight">{roomCode}</span></h2>
             <p>Your Nickname: {nickname}{isAdmin ? " (Admin)" : ""}</p>

            {(currentError || lobbyError) && <p className="error">{currentError || lobbyError}</p>}

            <h3>Players ({users.length}/{MAX_PLAYERS}):</h3>
            <ul className="user-list">
              {Array.isArray(users) && users.map((user) => (
                <li key={user?.socketId || user?.nickname} className={user?.nickname === nickname ? 'current-player' : ''}>
                    <div className="player-name-area">
                        {user?.isAdmin && <span className="admin-badge" title="Room Admin">⭐ Admin</span>}
                        <span>{user?.nickname}</span>
                        {user?.nickname === nickname && " (You)"}
                    </div>
                    <div className="player-status-details"></div>
                </li>
              ))}
            </ul>

            {isAdmin && !showModeSelection && (
                 <button className="start-game-btn" onClick={handleShowModeSelection} disabled={isStarting || users.length < MIN_PLAYERS_TO_START} title={users.length < MIN_PLAYERS_TO_START ? `Need ${MIN_PLAYERS_TO_START}+ players` : 'Start the game'} >
                    {isStarting ? 'Starting...' : 'Start Game'}
                 </button>
            )}

            {isAdmin && showModeSelection && (
                 <div className="mode-selection card-layout">
                    <h4>Select Game Mode:</h4>
                    <div className="mode-cards">
                        {GAME_MODES.map(mode => (
                            <div key={mode.id} className="mode-card" onClick={() => !isStarting && handleSelectMode(mode.id)} tabIndex={isStarting ? -1 : 0}>
                                <div className="mode-card-header">
                                    <span className="mode-card-icon">{mode.icon}</span>
                                    <span className="mode-card-name">{mode.name}</span>
                                </div>
                                <div className="mode-card-desc">{mode.description}</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => { setShowModeSelection(false); setLobbyError(''); }} className="cancel-btn" disabled={isStarting}> Cancel </button>
                </div>
            )}

            <button className="leave-room-btn" onClick={onLeaveRoom}> Leave Room </button>
        </div>
    );
}

export default LobbyRoom;