import React, { useState, useEffect } from 'react';

// Accept onClick prop to bubble up click for enabling audio
function LobbyEntry({ nickname, onNicknameChange, onCreateRoom, onJoinRoom, currentError, onClick }) {
    const [roomInputCode, setRoomInputCode] = useState("");
    const [isLoading, setIsLoading] = useState(false); // Loading state

    const handleCreateClick = (e) => {
        e.preventDefault();
        if (isLoading || !nickname.trim()) return;
        setIsLoading(true);
        onCreateRoom();
        setTimeout(() => setIsLoading(false), 4000);
    };

    const handleJoinClick = (e) => {
        e.preventDefault();
        if (isLoading || !nickname.trim() || !roomInputCode.trim()) return;
        setIsLoading(true);
        onJoinRoom(roomInputCode);
        setTimeout(() => setIsLoading(false), 4000);
    };

    useEffect(() => { if (currentError) { setIsLoading(false); } }, [currentError]);
    useEffect(() => { setIsLoading(false); }, []);

    return (
        // Add onClick handler to main div
        <div className="content entry-view" onClick={onClick} role="button" tabIndex="0">
            <h1>Party Game Lobby</h1>
            {currentError && <p className="error">{currentError}</p>}

            <div className="entry-container">
                <input
                    type="text"
                    placeholder="Enter your nickname"
                    value={nickname}
                    onChange={(e) => onNicknameChange(e.target.value)}
                    maxLength={20}
                    className="nickname-input"
                    disabled={isLoading}
                />

                <div className="action-section">
                    <h2>Create a New Room</h2>
                    <button
                        className="create-room-btn"
                        onClick={handleCreateClick}
                        disabled={isLoading || !nickname.trim()}
                    >
                        {isLoading ? 'Creating...' : 'Create Room'}
                    </button>
                </div>

                <div className="action-section join-section">
                    <h2>Join an Existing Room</h2>
                    <input
                        type="text"
                        placeholder="Enter room code"
                        value={roomInputCode}
                        onChange={(e) => setRoomInputCode(e.target.value)}
                        maxLength={6}
                        className="room-code-input"
                        disabled={isLoading}
                    />
                    <button
                        className="join-room-btn"
                        onClick={handleJoinClick}
                        disabled={isLoading || !nickname.trim() || !roomInputCode.trim()}
                    >
                         {isLoading ? 'Joining...' : 'Join Room'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LobbyEntry;