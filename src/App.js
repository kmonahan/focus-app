/* globals Spotify */
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  // State Hooks
  const [accessToken, setAccessToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [player, setPlayer] = useState(null);

  // Callback Hooks
  const _api = useCallback(async (endpoint) => {
    const response = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.json();
  }, [accessToken]);

  // Effect Hooks
  // Set access token if returned from Spotify.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(`?${hash.substr(1)}`);
      if (hashParams.has('access_token')) {
        const accessToken = hashParams.get('access_token');
        setAccessToken(accessToken);
      }
    }
  }, []);

  // Fetch user account data from Spotify.
  useEffect(() => {
    async function fetchUserData() {
      const userData = await _api('me');
      setUserData(userData)
    }

    if (accessToken) {
      fetchUserData();
    }
  }, [_api, accessToken]);

  // Fetch available playlists from Spotify.
  useEffect(() => {
    async function fetchPlaylistData() {
      const playlistData = await _api('browse/categories/focus/playlists');
      setPlaylists(playlistData.playlists.items);
    }

    if (accessToken) {
      fetchPlaylistData();
    }
  }, [_api, accessToken]);

  // Randomly select a playlist.
  useEffect(() => {
    async function fetchPlaylistData(playlist) {
      const playlistData = await _api(`playlists/${playlist.id}`);
      setSelectedPlaylist(playlistData);
    }

    if (playlists.length) {
      const max = playlists.length - 1;
      const randomSelection = Math.floor(Math.random() * (max + 1));
      const selectedPlaylist = playlists[randomSelection];
      fetchPlaylistData(selectedPlaylist);
    }
  }, [playlists, _api]);

  // Create the Spotify Player.
  useEffect(() => {
    async function createPlayer() {
      const player = new Spotify.Player({
        name: 'Web Playback SDK Quick Start Player',
        getOAuthToken: cb => cb(accessToken)
      });
      const connection = await player.connect();
      if (connection) {
        player.addListener('ready', () => setPlayer(player));
      }
    }

    if (accessToken) {
      createPlayer();
    }
  }, [accessToken]);

  async function play({spotify_uri, id}) {
    return fetch(`https://api.spotify.com/v1/me/player/play?device_id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({uris: [spotify_uri]}),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
    });
  }

  // TODO: Play the actual selected playlist
  // TODO: Play all tracks in the playlist
  async function playMusic() {
    const currentState = await player.getCurrentState();
    if (currentState && currentState.paused) {
      await player.resume();
    } else {
      await play({
        id: player._options.id,
        spotify_uri: selectedPlaylist.tracks.items[0].track.uri,
      });
    }
    setIsPlaying(true);
  }

  async function pauseMusic() {
    await player.pause();
    setIsPlaying(false);
  }

  function togglePlayback() {
    if (isPlaying) {
      pauseMusic();
    } else {
      playMusic();
    }
  }

  if (userData === null) {
    return (
      <div className="App">
          <a className="Login"
             href="https://accounts.spotify.com/authorize?client_id=637350d3910a4c31a0f06caa6c31366a&redirect_uri=http%3A%2F%2Flocalhost%3A3000&scope=streaming%20user-read-email%20user-read-private&response_type=token&state=12345">
            Get Started
          </a>
      </div>
    );
  } else {
    return (
      <div className="App">
        <h1>Welcome, {userData.display_name}!</h1>
        {selectedPlaylist && player && (
          <div>
            <h2>{selectedPlaylist.name}</h2>
            <button onClick={togglePlayback}>{isPlaying ? 'Playing' : 'Play something'}</button>
          </div>
        )}
      </div>
    );
  }
}

export default App;
