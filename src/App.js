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
  const [tracks, setTracks] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(60);

  // Callback Hooks
  const _api = useCallback(async (endpoint) => {
    const response = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.json();
  }, [accessToken]);

  async function play({id, tracksToPlay = []}) {
    const params = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
    };
    if (tracksToPlay) {
      params.body = JSON.stringify({uris: tracksToPlay});
    }
    return fetch(`https://api.spotify.com/v1/me/player/play?device_id=${id}`, params);
  }

  // TODO: Play next page of tracks when first is finished.
  // TODO: Randomly choose another playlist after first finishes.
  // TODO: Update timer if user pauses music via another device.
  async function playMusic() {
    const currentState = await player.getCurrentState();
    if (currentState && currentState.paused) {
      await player.resume();
    } else if (currentState && currentState.track_window && currentState.track_window.current_track) {
      await play({id: player._options.id});
    } else {
      await play({
        id: player._options.id,
        tracksToPlay: tracks,
      });
    }
    setIsPlaying(true);
  }

  const pauseMusic = useCallback(async () => {
    await Promise.all([player.pause(), setIsPlaying(false)]);
    if (timeRemaining <= 0) {
      setTimeRemaining(60);
    }
  }, [player, timeRemaining]);

  function togglePlayback() {
    if (isPlaying) {
      pauseMusic();
    } else {
      playMusic();
    }
  }
  // Effect Hooks
  // Set access token if returned from Spotify.
  // TODO: Handle case when access token expires.
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

  // Gather up the next set of tracks to play.
  useEffect(() => {
    if (selectedPlaylist) {
      const tracks = selectedPlaylist.tracks.items.map(item => item.track.uri);
      setTracks(tracks);
    }
  }, [selectedPlaylist]);

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


  // TODO: Handle case where user is not premium.
  // TODO: Switch to server-side authentication.
  if (userData === null) {
    return (
      <div className="App">
          <a className="Login"
             href="https://accounts.spotify.com/authorize?client_id=637350d3910a4c31a0f06caa6c31366a&redirect_uri=http%3A%2F%2Flocalhost%3A3000&scope=streaming%20user-read-email%20user-read-private%20user-modify-playback-state&response_type=token&state=12345">
            Get Started
          </a>
      </div>
    );
  } else {
    const countdown = new Date(timeRemaining * 1000).toISOString().substr(11, 8);
    return (
      <div className="App">
        <h1>Welcome, {userData.display_name}!</h1>
        {selectedPlaylist && player && (
          <div>
            <h2>{selectedPlaylist.name}</h2>
            <div className="countdown">{countdown}</div>
            <button onClick={togglePlayback}>{isPlaying ? 'Pause Timer' : 'Start Timer'}</button>
          </div>
        )}
      </div>
    );
  }
}

export default App;
