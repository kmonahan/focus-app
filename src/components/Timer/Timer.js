import React, {useEffect, useState} from 'react';
import './Timer.css';

function Timer({isPlaying, pauseMusic, onFinish}) {
  // Constants
  const DEFAULT_TIME = 1500;
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_TIME);

  // Run the timer.
  useEffect(() => {
    let timeout;
    if (isPlaying) {
      if (timeRemaining > 0) {
        timeout = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      } else if (timeRemaining === 0) {
        pauseMusic();
      }
    }
    return () => clearTimeout(timeout);
  }, [timeRemaining, isPlaying, pauseMusic]);

  // Update timer when expired.
  useEffect(() => {
    if (!isPlaying && timeRemaining <= 0) {
      setTimeRemaining(DEFAULT_TIME);
      onFinish();
    }
  }, [isPlaying, timeRemaining, onFinish]);

  const countdown = new Date(timeRemaining * 1000).toISOString().substr(11, 8);
  return (
    <div className="timer">{countdown}</div>
  );
}

export default Timer;