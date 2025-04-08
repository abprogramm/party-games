import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti'; // Import confetti library

// Define IMPOSTOR_ROUNDS constant
const IMPOSTOR_ROUNDS = 3;

// Accept playSound and audio refs as props
function ImpostorGame({ socket, roomCode, nickname, isAdmin, users, gameState, playerRole, onLeave, onReturnToLobby, playSound, notificationAudioRef, errorAudioRef }) {

    const [clueInput, setClueInput] = useState('');
    const [selectedVote, setSelectedVote] = useState('');
    const [gameError, setGameError] = useState('');
    const confettiFiredRef = useRef(false);

    // Derived state
    const currentRound = gameState?.currentRound;
    const myTurn = gameState?.currentTurnNickname === nickname;
    const myClues = gameState?.clues?.[nickname] || [];
    const cluePhaseActive = gameState?.phase?.startsWith('clue_giving');
    const alreadySubmittedThisRound = cluePhaseActive && currentRound > 0 && myClues[currentRound - 1] !== undefined;
    const canSubmitClue = myTurn && cluePhaseActive && !alreadySubmittedThisRound;
    const myVote = gameState?.votes?.[nickname];
    const isVotingPhase = gameState?.phase === 'voting';
    const isRevealPhase = gameState?.phase === 'reveal';
    const results = gameState?.results;

    // --- Confetti Effect ---
    useEffect(() => {
        if (isRevealPhase && results && !confettiFiredRef.current) {
            const amImpostor = playerRole?.role === 'impostor';
            const didIWin = (results.winner === 'impostor' && amImpostor) || (results.winner === 'players' && !amImpostor);
            if (didIWin) {
                console.log("Player won! Firing confetti.");
                confettiFiredRef.current = true;
                confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
                setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } }), 250);
                setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 } }), 400);
                // Play win sound here? Requires winSoundRef passed down
                // playSound(winSoundRef);
            } else {
                 // Play lose sound here? Requires loseSoundRef passed down
                 // playSound(loseSoundRef);
            }
        }
        if (!isRevealPhase) { confettiFiredRef.current = false; }
    }, [isRevealPhase, results, playerRole]); // Removed playSound/refs dependency for now


    useEffect(() => { setClueInput(''); setGameError(''); setSelectedVote(''); }, [gameState?.currentTurnNickname, gameState?.phase, gameState?.currentRound]);

    const handleClueSubmit = (e) => {
        e.preventDefault();
        const clue = clueInput.trim();
        setGameError('');
        if (!canSubmitClue) { setGameError("Cannot submit clue now."); return; }
        if (!clue) { setGameError("Please enter a clue."); return; }
        socket.emit('submit_clue', { roomCode, clue });
        //playSound(notificationAudioRef); // Play sound on successful submit attempt
    };

    const handleVoteSubmit = (e) => {
        e.preventDefault();
        setGameError('');
        if (!isVotingPhase) { setGameError("Not voting phase."); return; }
        if (myVote) { setGameError("You have already voted."); return; }
        if (!selectedVote) { setGameError("Please select a player to vote for."); return; }
        socket.emit('submit_vote', { roomCode, votedNickname: selectedVote });
         //playSound(notificationAudioRef); // Play sound on successful vote attempt
    };

    const getSimplePhaseName = () => {
        if (isRevealPhase) return 'Results';
        if (isVotingPhase) return 'Voting';
        if (cluePhaseActive) return 'Clue Giving';
        return 'Starting';
    };

    // Determine Win/Loss for message display
    const amImpostor = playerRole?.role === 'impostor';
    const didIWin = isRevealPhase && results && (
        (results.winner === 'impostor' && amImpostor) ||
        (results.winner === 'players' && !amImpostor)
    );

    // --- RENDER ---
    return (
        <div className={`content game-view impostor-game phase-${gameState?.phase}`}>
            <h2>Impostor!</h2>
            <div className="game-status-display">
                <div className="status-item phase"><span className="status-label">Phase</span><span className="status-value">{getSimplePhaseName()}</span></div>
                {cluePhaseActive && currentRound > 0 && (<div className="status-item round"><span className="status-label">Round</span><span className="status-value">{currentRound}/{IMPOSTOR_ROUNDS}</span></div>)}
                {cluePhaseActive && gameState.currentTurnNickname && (<div className="status-item turn"><span className="status-label">Turn</span><span className="status-value">{gameState.currentTurnNickname}</span></div>)}
                {isVotingPhase && (<div className="status-item votes-cast"><span className="status-label">Votes Cast</span><span className="status-value">{gameState.votes ? Object.keys(gameState.votes).length : 0}/{users.length}</span></div>)}
            </div>
            <div className="role-info-box">
                 {playerRole ? (playerRole.role === 'impostor' ? (<div className="role-display role-impostor"><span className="role-name">Impostor</span></div>) : (<div className="role-display role-innocent"><span className="role-name">Innocent</span><p className="role-word">The word is: <strong className="highlight-word">{playerRole.word}</strong></p></div>)) : (<p className="assigning-role-text">Assigning roles...</p>)}
            </div>
            {gameError && <p className="error">{gameError}</p>}
            {cluePhaseActive && (<div className="clue-submission"><h4>{myTurn ? "Your Turn!" : `Round ${currentRound} Clues`}</h4>{myTurn && !alreadySubmittedThisRound && (<form onSubmit={handleClueSubmit}><input type="text" value={clueInput} onChange={(e)=>setClueInput(e.target.value)} placeholder={"Enter your clue..."} disabled={!canSubmitClue} maxLength={50} /><button type="submit" disabled={!canSubmitClue}> Submit </button></form>)}{alreadySubmittedThisRound && <p className="info-text"><i>Your clue for Round {currentRound} submitted!</i></p>}{!myTurn && cluePhaseActive && <p className="info-text"><i>Waiting for {gameState.currentTurnNickname}...</i></p>}</div>)}
            <div className="player-status-list">
                <h3>Players</h3>
                <ul className="user-list">
                    {Array.isArray(users) && users.map((user)=>{ const userClues=gameState?.clues?.[user.nickname]||[]; const isTheirTurn=gameState?.currentTurnNickname===user.nickname&&cluePhaseActive; const hasVoted=!!gameState?.votes?.[user.nickname]; const isImpostorRevealed=isRevealPhase&&user.nickname===gameState.results?.impostorNickname; const voteTarget=isRevealPhase?gameState.votes?.[user.nickname]:null; return (<li key={user.socketId||user.nickname} className={` ${user.nickname===nickname?'current-player':''} ${isTheirTurn?'active-turn':''} ${hasVoted&&isVotingPhase?'has-voted':''} `}> <div className="player-name-area">{user.isAdmin&&<span className="admin-badge" title="Room Admin">⭐ Admin</span>}<span>{user.nickname}</span>{user.nickname===nickname&&" (You)"}{isImpostorRevealed&&(<span className="role-reveal highlight-impostor"> (IMPOSTOR!)</span>)}</div> <div className="player-status-details">{userClues.length>0&&(<div className="clue-list">{userClues.map((clue,index)=>clue?(<span key={index} className="player-clue">R{index+1}: {clue}</span>):null)}</div>)}{isVotingPhase&&(<span className={`vote-status ${hasVoted?'voted':'waiting'}`}>{hasVoted?'✓ Voted':'... Voting'}</span>)}{isRevealPhase&&voteTarget&&(<span className="vote-target">Voted for: {voteTarget}</span>)}</div> </li>);})}
                </ul>
            </div>
            {isVotingPhase && !isRevealPhase && (<div className="voting-area"><h4>Vote for the Impostor!</h4><form onSubmit={handleVoteSubmit}><div className="vote-options">{users.map(user=>(<button type="button" key={user.nickname} onClick={()=>setSelectedVote(user.nickname)} className={`vote-btn ${selectedVote===user.nickname?'selected':''}`} disabled={!!myVote}>{user.nickname}</button>))}</div><button type="submit" className="submit-vote-btn" disabled={!selectedVote||!!myVote}>{myVote?'Vote Submitted':'Submit Vote'}</button></form></div>)}
            {isRevealPhase && results && (
                <div className="reveal-area">
                    {didIWin !== null && ( didIWin ? (<div className="win-lose-message winner-message">YOU WIN!</div>) : (<div className="win-lose-message loser-message">YOU LOSE!</div>) )}
                    <h4>Results</h4>
                    <p>The Impostor was: <strong className="highlight-impostor">{results.impostorNickname}</strong></p>
                    {results.mostVotedNicknames.length>0?(<p>Most votes ({results.voteCounts[results.mostVotedNicknames[0]]||0}) went to: <strong>{results.mostVotedNicknames.join(', ')}</strong></p>):(<p>No votes were cast!</p>)}
                    <p className={`winner-announcement ${results.winner}`}> {results.impostorWasCaught?`The Impostor was caught! Players Win!`:`The Impostor escaped! Impostor Wins!`} </p>
                </div>
            )}
            <div className="game-actions">
                {isRevealPhase ? (<button className="back-to-lobby-btn" onClick={onReturnToLobby}> Back to Lobby </button>) : (<button className="leave-room-btn" onClick={onLeave}> Leave Game </button>)}
            </div>
        </div>
    );
}

export default ImpostorGame;