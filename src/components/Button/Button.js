import React from 'react';
import './Button.css';

function Button({isPlaying, onTogglePlayback}) {
  function handleClick(event) {
    event.preventDefault();
    onTogglePlayback();
  }

  return (
    <button className={`button ${isPlaying ? 'button--playing' : 'button--paused'}`} onClick={handleClick}>{isPlaying ? 'Pause Timer' : 'Start Timer'}</button>
  )
}

export default Button;