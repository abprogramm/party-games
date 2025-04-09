import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

const IMPOSTOR_ROUNDS = 3;

function ImpostorGame({ socket, roomCode, nickname, isAdmin, users, gameState, playerRole, onLeave, onReturnToLobby }) {

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
    const myFinalVote = gameState?.votes?.[nickname]; // Final impostor vote
    const isVotingPhase = gameState?.phase === 'voting'; // Final voting phase
    const isRevealPhase = gameState?.phase === 'reveal';
    const results = gameState?.results;
    // New derived state for intermediate vote
    const isRoundEndVotePhase = gameState?.phase === 'round_end_vote';
    const myRoundEndVote = gameState?.roundEndVotes?.[nickname]; // Vote for next round/vote now

    useEffect(() => { setClueInput(''); setGameError(''); setSelectedVote(''); }, [gameState?.currentTurnNickname, gameState?.phase, gameState?.currentRound]);
    useEffect(() => { /* ... confetti logic ... */ }, [isRevealPhase, results, playerRole]);

    const handleClueSubmit = (e) => {
        e.preventDefault(); const clue = clueInput.trim(); setGameError('');
        if (!myTurn || !cluePhaseActive || alreadySubmittedThisRound) { setGameError("Cannot submit clue now."); return; }
        if (!clue) { setGameError("Please enter a clue."); return; }
        socket.emit('submit_clue', { roomCode, clue });
    };
    const handleVoteSubmit = (e) => { // Final vote submit
        e.preventDefault(); setGameError('');
        if (!isVotingPhase) { setGameError("Not final voting phase."); return; }
        if (myFinalVote) { setGameError("You have already voted."); return; }
        if (!selectedVote) { setGameError("Please select a player to vote for."); return; }
        socket.emit('submit_vote', { roomCode, votedNickname: selectedVote });
    };

    // New handler for intermediate vote
    const handleRoundEndVoteSubmit = (choice) => {
        setGameError('');
        if (!isRoundEndVotePhase) { setGameError("Not the time to vote on rounds."); return; }
        if (myRoundEndVote) { setGameError("You already voted."); return; }
        socket.emit('submit_round_end_vote', { roomCode, voteChoice: choice });
    };

    const getSimplePhaseName = () => {
        if (isRevealPhase) return 'Results';
        if (isVotingPhase) return 'Final Voting'; // Differentiate
        if (isRoundEndVotePhase) return 'Next Step Vote'; // New phase name
        if (cluePhaseActive) return 'Clue Giving';
        return 'Starting';
    };

    const amImpostor = playerRole?.role === 'impostor';
    const didIWin = isRevealPhase && results && ( (results.winner === 'impostor' && amImpostor) || (results.winner === 'players' && !amImpostor) );

    // --- RENDER ---
    return (
        <div className={`content game-view impostor-game phase-${gameState?.phase}`}>
            <h2>Impostor!</h2>
            <div className="game-status-display">
                <div className="status-item phase"><span className="status-label">Phase</span><span className="status-value">{getSimplePhaseName()}</span></div>
                {(cluePhaseActive || isRoundEndVotePhase) && currentRound > 0 && (<div className="status-item round"><span className="status-label">Round</span><span className="status-value">{currentRound}/{IMPOSTOR_ROUNDS}</span></div>)}
                {cluePhaseActive && gameState.currentTurnNickname && (<div className="status-item turn"><span className="status-label">Turn</span><span className="status-value">{gameState.currentTurnNickname}</span></div>)}
                {isVotingPhase && (<div className="status-item votes-cast"><span className="status-label">Votes Cast</span><span className="status-value">{gameState.votes ? Object.keys(gameState.votes).length : 0}/{users.length}</span></div>)}
                {isRoundEndVotePhase && (<div className="status-item votes-cast"><span className="status-label">Votes Cast</span><span className="status-value">{gameState.roundEndVotes ? Object.keys(gameState.roundEndVotes).length : 0}/{users.length}</span></div>)}
            </div>

            {gameState?.category && !isRevealPhase && !isRoundEndVotePhase && ( <p className="game-category-display"> Category: <strong>{gameState.category}</strong> </p> )}
            <div className="role-info-box">
                 {playerRole ? (playerRole.role === 'impostor' ? (<div className="role-display role-impostor"><span className="role-name">Impostor</span></div>) : (<div className="role-display role-innocent"><span className="role-name">Innocent</span> {playerRole.word && (<p className="role-word">The word is: <strong className="highlight-word">{playerRole.word}</strong></p>)}</div>)) : (<p className="assigning-role-text">Assigning roles...</p>)}
            </div>
            {gameError && <p className="error">{gameError}</p>}
            {cluePhaseActive && (<div className="clue-submission"><h4>{myTurn ? "Your Turn!" : `Round ${currentRound} Clues`}</h4>{myTurn && !alreadySubmittedThisRound && (<form onSubmit={handleClueSubmit}><input type="text" value={clueInput} onChange={(e)=>setClueInput(e.target.value)} placeholder={"Enter your clue..."} disabled={!canSubmitClue} maxLength={50} /><button type="submit" disabled={!canSubmitClue}> Submit </button></form>)}{alreadySubmittedThisRound && <p className="info-text"><i>Your clue for Round {currentRound} submitted!</i></p>}{!myTurn && cluePhaseActive && <p className="info-text"><i>Waiting for {gameState.currentTurnNickname}...</i></p>}</div>)}

            {/* --- Intermediate Round End Voting UI --- */}
            {isRoundEndVotePhase && !isRevealPhase && (
                <div className="round-end-vote-area voting-area">
                    <h4>Round {gameState.currentRound} complete!</h4> {/* Show completed round */}
                    <p className="info-text">Vote to proceed to the next clue round or start the final vote now.</p>
                    <div className="vote-options round-end-options">
                        <button type="button" onClick={() => handleRoundEndVoteSubmit('next_round')} className={`vote-btn next-round ${myRoundEndVote === 'next_round' ? 'selected' : ''}`} disabled={!!myRoundEndVote} > Next Clue Round ({gameState.currentRound}/{IMPOSTOR_ROUNDS}) </button>
                        <button type="button" onClick={() => handleRoundEndVoteSubmit('vote_now')} className={`vote-btn vote-now ${myRoundEndVote === 'vote_now' ? 'selected' : ''}`} disabled={!!myRoundEndVote} > Vote for Impostor Now! </button>
                    </div>
                     {myRoundEndVote && <p className="info-text"><i>Your vote submitted! Waiting for others...</i></p>}
                </div>
            )}
            {/* --- End Intermediate Voting --- */}

            <div className="player-status-list">
                <h3>Players</h3>
                 <ul className="user-list">
                    {Array.isArray(users) && users.map((user) => {
                        const userClues = gameState?.clues?.[user.nickname] || [];
                        const isTheirTurn = gameState?.currentTurnNickname === user.nickname && cluePhaseActive;
                        const hasFinalVoted = !!gameState?.votes?.[user.nickname]; // Final vote
                        const hasRoundEndVoted = !!gameState?.roundEndVotes?.[user.nickname]; // Intermediate vote
                        const isImpostorRevealed = isRevealPhase && results?.impostorNicknames?.includes(user.nickname);
                        const voteTarget = isRevealPhase ? gameState.votes?.[user.nickname] : null;

                        return (
                            <li key={user.socketId || user.nickname} className={` ${user.nickname === nickname ? 'current-player' : ''} ${isTheirTurn ? 'active-turn' : ''} ${(hasFinalVoted && isVotingPhase) || (hasRoundEndVoted && isRoundEndVotePhase) ? 'has-voted' : ''} `} >
                                <div className="player-name-area">{user.isAdmin&&<span className="admin-badge" title="Room Admin">⭐ Admin</span>}<span>{user.nickname}</span>{user.nickname===nickname&&" (You)"}{isImpostorRevealed&&(<span className="role-reveal highlight-impostor"> (IMPOSTOR!)</span>)}</div>
                                <div className="player-status-details">
                                     {userClues.length > 0 && ( <div className="clue-list">{userClues.map((clue, index) => clue ? ( <span key={index} className="player-clue">R{index + 1}: {clue}</span> ) : null)}</div> )}
                                     {/* Show appropriate vote status */}
                                     {isVotingPhase && (<span className={`vote-status ${hasFinalVoted ? 'voted' : 'waiting'}`}>{hasFinalVoted ? '✓ Voted (Final)' : '... Voting'}</span> )}
                                     {isRoundEndVotePhase && (<span className={`vote-status ${hasRoundEndVoted ? 'voted' : 'waiting'}`}>{hasRoundEndVoted ? '✓ Voted (Round)' : '... Voting'}</span> )}
                                     {isRevealPhase && voteTarget && ( <span className="vote-target">Voted for: {voteTarget}</span> )}
                                </div>
                            </li>
                        );
                    })}
                 </ul>
            </div>

            {/* Final Voting UI */}
            {isVotingPhase && !isRevealPhase && ( <div className="voting-area"><h4>Vote for the Impostor!</h4><form onSubmit={handleVoteSubmit}><div className="vote-options">{users.map(user=>(<button type="button" key={user.nickname} onClick={()=>setSelectedVote(user.nickname)} className={`vote-btn ${selectedVote===user.nickname?'selected':''}`} disabled={!!myFinalVote}>{user.nickname}</button>))}</div><button type="submit" className="submit-vote-btn" disabled={!selectedVote||!!myFinalVote}>{myFinalVote?'Vote Submitted':'Submit Vote'}</button></form></div> )}

            {/* Reveal UI */}
            {isRevealPhase && results && ( <div className="reveal-area">{didIWin!==null&&(didIWin?(<div className="win-lose-message winner-message">YOU WIN!</div>):(<div className="win-lose-message loser-message">YOU LOSE!</div>))}<h4>Results</h4><p className="reveal-num-impostors">(This was a {results.impostorNicknames.length}-Impostor game!)</p><p>The Impostor(s) were: <strong className="highlight-impostor">{results.impostorNicknames.join(' & ')}</strong></p>{results.mostVotedNicknames.length>0?(<p>Most votes ({results.voteCounts[results.mostVotedNicknames[0]]||0}) went to: <strong>{results.mostVotedNicknames.join(', ')}</strong></p>):(<p>No votes were cast!</p>)}<p className={`winner-announcement ${results.winner}`}>{results.impostorWasCaught?`An Impostor was caught! Players Win!`:`The Impostor(s) escaped! Impostor(s) Win!`}</p></div> )}

            {/* Action Buttons */}
            <div className="game-actions">{isRevealPhase ? (<button className="back-to-lobby-btn" onClick={onReturnToLobby}> Back to Lobby </button>) : (<button className="leave-room-btn" onClick={onLeave}> Leave Game </button>)}</div>
        </div>
    );
}

export default ImpostorGame;