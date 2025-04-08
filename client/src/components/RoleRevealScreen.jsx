import React, { useEffect, useState } from 'react';

const FADE_OUT_DELAY_MS = 3000; // Start fade ~0.5s before App hides it (3500 - 500)

function RoleRevealScreen({ playerRole }) {
    const [isFading, setIsFading] = useState(false);

    const roleName = playerRole?.role === 'impostor' ? 'Impostor' : 'Innocent';
    const roleClassName = playerRole?.role === 'impostor' ? 'role-impostor' : 'role-innocent';

    useEffect(() => {
        // Reset fading state on new role prop, just in case
        setIsFading(false);

        // Start fade-out animation slightly before the App component hides this screen
        const fadeTimer = setTimeout(() => {
            console.log("Role reveal screen starting fade out animation.");
            setIsFading(true);
        }, FADE_OUT_DELAY_MS);

        // Cleanup timeout on component unmount or if playerRole changes
        return () => clearTimeout(fadeTimer);
    }, [playerRole]); // Rerun if playerRole changes (though unlikely mid-reveal)

    return (
        <div className={`content role-reveal-screen ${isFading ? 'fading-out' : ''}`}>
            <h1>Your Role</h1>
            <div className={`revealed-role ${roleClassName}`}>
                {roleName}
            </div>
            {roleName === 'Innocent' && playerRole?.word && (
                <p className="reveal-word">The word is: <strong className="highlight-word">{playerRole.word}</strong></p>
            )}
             {roleName === 'Impostor' && (
                <p className="reveal-instruction">Blend in. Don't get caught!</p>
            )}
        </div>
    );
}

export default RoleRevealScreen;