import React, { useState, useEffect } from 'react';

const ROLES_TO_ANIMATE = ["Innocent", "Impostor"];
const ANIMATION_INTERVAL_MS = 300; // How fast roles cycle

function CountdownScreen({ countdownValue }) {
    const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        // Interval for the role animation
        const animationInterval = setInterval(() => {
            setIsFadingOut(true); // Start fade out
            setTimeout(() => {
                 setCurrentRoleIndex(prevIndex => (prevIndex + 1) % ROLES_TO_ANIMATE.length);
                 setIsFadingOut(false); // Finish fade out, fade in new text
            }, ANIMATION_INTERVAL_MS / 2); // Change text halfway through interval
        }, ANIMATION_INTERVAL_MS);

        // Cleanup interval on component unmount
        return () => clearInterval(animationInterval);
    }, []); // Run only once on mount

    const displayedRole = ROLES_TO_ANIMATE[currentRoleIndex];
    const roleClassName = displayedRole === "Impostor" ? "role-impostor" : "role-innocent";

    return (
        <div className="content countdown-screen">
            <h1>Game Starting!</h1>
            <div className="countdown-number">
                {/* Display countdown value or GO! */}
                {countdownValue > 0 ? countdownValue : 'GO!'}
            </div>
            <div className="role-animation">
                <span className={`role-text ${roleClassName} ${isFadingOut ? 'fading-out' : ''}`}>
                    {displayedRole}
                </span>
            </div>
            <p>Get ready...</p>
        </div>
    );
}

export default CountdownScreen;