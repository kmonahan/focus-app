/* globals Spotify */
import React, {useCallback, useEffect, useState} from 'react';
import Cookie from 'js-cookie';
import './App.css';
import Button from './components/Button/Button';
import Error from './components/Error/Error';
import Login from './components/Login/Login';
import Timer from './components/Timer/Timer';
import User from './components/User/User';

import randomState from './utilities/randomState';

function App() {
  // State Hooks
  const [stateToken, setStateToken] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [playlistData, setPlaylistData] = useState(null);
  const [player, setPlayer] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Callback Hooks
  const _api = useCallback(async (endpoint) => {
    let url = endpoint;
    if (endpoint.indexOf('http') !== 0) {
      url = `https://api.spotify.com/v1/${endpoint}`;
    }
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.json();
  }, [accessToken]);

  const pauseMusic = useCallback(async () => {
    await Promise.all([player.pause(), setIsPlaying(false)]);
  }, [player]);

  const _handleError = useCallback(err => {
    console.error(err);
    setErrorMessage(err);
    setAccessToken(null);
  }, []);

  const randomlyChoosePlaylist = useCallback(() => {
    if (playlists.length) {
      const max = playlists.length - 1;
      const randomSelection = Math.floor(Math.random() * (max + 1));
      return playlists[randomSelection];
    }
    return null;
  }, [playlists]);

  const fetchPlaylistData = useCallback(async playlist => {
    try {
      const playlistData = await _api(`playlists/${playlist.id}`);
      setPlaylistData(playlistData);
    } catch (err) {
      _handleError(err);
    }
  }, [_api, _handleError]);

  const getNewPlaylist = useCallback(() => {
    const randomPlaylist = randomlyChoosePlaylist();
    if (randomPlaylist) {
      fetchPlaylistData(randomPlaylist);
    }
  }, [randomlyChoosePlaylist, fetchPlaylistData]);

  const fetchMoreTracks = useCallback(async () => {
    // Are there more pages in the playlist?
    if (playlistData && playlistData.tracks.next) {
      try {
        const nextPage = await _api(playlistData.tracks.next);
        setPlaylistData(nextPage);
      } catch (err) {
        _handleError(err);
      }
    } else {
      getNewPlaylist();
    }
  }, [playlistData, _api, _handleError, getNewPlaylist]);

  const onPlaybackStateChange = useCallback(({track_window}) => {
    if (!track_window.next_tracks.length) {
      // Fetch more tracks.
      fetchMoreTracks();
    }
    console.log('track window', track_window);
  }, [fetchMoreTracks]);

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

  // TODO: Refactor to rely less on a chain of event hooks.
  // TODO: Update timer if user pauses music via another device.
  // TODO: Check if user's token is going to expire midway through the next pomodoro and go ahead and refresh it if necessary.
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

  function togglePlayback() {
    if (isPlaying) {
      pauseMusic();
    } else {
      playMusic();
    }
  }

  // Effect Hooks
  // Generate a state token to use in the Spotify Auth request.
  useEffect(() => {
    const tokenCookie = Cookie.get('stateToken');
    if (tokenCookie) {
      setStateToken(tokenCookie);
    } else {
      const token = randomState();
      Cookie.set('stateToken', token);
      setStateToken(token);
    }
  }, [stateToken]);

  // Set access token if returned from Spotify.
  useEffect(() => {
    const hash = window.location.hash;
    if (stateToken && hash) {
      const hashParams = new URLSearchParams(`?${hash.substr(1)}`);
      if (hashParams.has('access_token')) {
        const accessToken = hashParams.get('access_token');
        const returnedState = hashParams.get('state');
        if (returnedState === stateToken) {
          setAccessToken(accessToken);
        } else {
          setErrorMessage('Invalid response state value.');
        }
      }
    }
    return () => setErrorMessage('');
  }, [stateToken]);

  // Fetch user account data from Spotify.
  useEffect(() => {
    async function fetchUserData() {
      try {
        const userData = await _api('me');
        setUserData(userData);
      } catch (err) {
        _handleError(err)
      }
    }

    if (accessToken) {
      fetchUserData();
    }
  }, [_api, accessToken, _handleError]);

  // Fetch available playlists from Spotify.
  // TODO: Allow user to choose from their own playlists.
  useEffect(() => {
    async function fetchPlaylistData() {
      try {
        const playlistData = await _api('browse/categories/focus/playlists');
        setPlaylists(playlistData.playlists.items);
      } catch (err) {
        _handleError(err);
      }
    }

    if (accessToken) {
      fetchPlaylistData();
    }
  }, [_api, accessToken, _handleError]);

  useEffect(() => {
    if (!playlistData) {
      getNewPlaylist();
    }
  }, [getNewPlaylist, playlists, playlistData]);

  // Create the Spotify Player.
  useEffect(() => {
    const player = new Spotify.Player({
      name: 'Web Playback SDK Quick Start Player',
      getOAuthToken: cb => cb(accessToken)
    });
    player.addListener('ready', function onReady() {
      setPlayer(player);
      player.removeListener('ready', onReady);
    });
    player.addListener('player_state_changed', onPlaybackStateChange);
    player.connect();

    return () => {
      if (typeof player === 'object') {
        player.removeListener('player_state_changed', onPlaybackStateChange);
      }
    }
  }, [accessToken, onPlaybackStateChange]);

  // Gather up the next set of tracks to play.
  useEffect(() => {
    if (playlistData) {
      const tracks = playlistData.tracks.items.map(item => item.track.uri);
      setTracks(tracks);
    }
  }, [playlistData]);


  // TODO: Handle case where user is not premium.
  let appContent;
  if (userData === null) {
    appContent = <Login state={stateToken}/>;
  } else {
    appContent = (
      <div>
        <User displayName={userData.display_name} />
        {playlistData && player && (
          <div>
            <h2>Now Playing: {playlistData.name}</h2>
            <Timer isPlaying={isPlaying} pauseMusic={pauseMusic} />
            <Button isPlaying={isPlaying} onTogglePlayback={togglePlayback}/>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="App">
      <h1>Focus</h1>
      {errorMessage && (
        <Error message={errorMessage}/>
      )}
      {appContent}
    </div>
  );
}

export default App;
