import React from 'react';
import './Login.css';

function Login() {
  return (
    <div>
      <p>A timer that plays a randomly selected "Focus" playlist from Spotify while you're working. Stay on one task until the music stops!</p>
      <a className="login"
         href="https://accounts.spotify.com/authorize?client_id=637350d3910a4c31a0f06caa6c31366a&redirect_uri=http%3A%2F%2Flocalhost%3A3000&scope=streaming%20user-read-email%20user-read-private%20user-modify-playback-state&response_type=token&state=12345">
        Get Started
      </a>
      <p className="disclaimer">You must have a Spotify Premium account to play music in your browser.</p>
    </div>
  )
}

export default Login;