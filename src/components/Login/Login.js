import React from 'react';
import './Login.css';

function Login({state}) {
  const CLIENT_ID = '637350d3910a4c31a0f06caa6c31366a';
  const REDIRECT_URI = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://elastic-galileo-ac394f.netlify.app/';
  const PERMISSSIONS = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state'
  ].join(',');
  return (
    <div>
      <p>A timer that plays a randomly selected "Focus" playlist from Spotify while you're working. Stay on one task until the music stops!</p>
      <a className="login"
         href={`https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(PERMISSSIONS)}&response_type=token&state=${state}`}>
        Get Started
      </a>
      <p className="disclaimer">You must have a Spotify Premium account to play music in your browser.</p>
    </div>
  )
}

export default Login;