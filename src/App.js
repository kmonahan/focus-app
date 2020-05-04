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
import ProgressMeter from './components/ProgressMeter/ProgressMeter';

function App() {
  // State Hooks
  const [stateToken, setStateToken] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [playlistData, setPlaylistData] = useState(null);
  const [player, setPlayer] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [pomodoroCount, setPomodoroCount] = useState(0);

  // Callback Hooks
  const _handleError = useCallback(err => {
    console.error(err);
    setErrorMessage(err);
    setAccessToken(null);
  }, []);


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

  const randomlyChoosePlaylist = useCallback((playlistSet) => {
    if (playlistSet.length) {
      const max = playlistSet.length - 1;
      const randomSelection = Math.floor(Math.random() * (max + 1));
      return playlistSet[randomSelection];
    }
    return null;
  }, []);

  const fetchPlaylistData = useCallback(async playlist => {
    try {
      const playlistData = await _api(`playlists/${playlist.id}`);
      setPlaylistData(playlistData);
    } catch (err) {
      _handleError(err);
    }
  }, [_api, _handleError]);

  const getNewPlaylist = useCallback((playlistSet) => {
    const randomPlaylist = randomlyChoosePlaylist(playlistSet);
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
      getNewPlaylist(playlists);
    }
  }, [playlistData, _api, _handleError, getNewPlaylist, playlists]);

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

  function finishPomodoro() {
    setIsReset(true);
    setPomodoroCount(pomodoroCount + 1);
  }

  // TODO: Check if user's token is going to expire midway through the next pomodoro and go ahead and refresh it if necessary.
  // TODO: Store pomodoros in cookie so they're not lost on refresh
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
    setIsReset(false);
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
  }, []);

  // Load any existing pomodoros from a cookie.
  useEffect(() => {
    const countCookie = Cookie.get('pomodoroCount');
    if (countCookie) {
      setPomodoroCount(parseInt(countCookie));
    }
  }, []);

  // Set access token if returned from Spotify.
  // Depends on state token. If the state token changes,
  // we should reauthenticate.
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
          _handleError('Invalid state token value. You must reauthenticate.');
        }
      }
    }
    return () => setErrorMessage('');
  }, [stateToken, _handleError]);

  // Fetch user account data from Spotify.
  // Depends on access token. If that changes,
  // we'll need to requery the user data.
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

  // Create the Spotify Player.
  useEffect(() => {
    if (accessToken) {
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
    }
  }, [accessToken, onPlaybackStateChange]);

  // Fetch available playlists from Spotify.
  // Depends on the access token, but we only
  // need to refetch playlists if we don't currently
  // have any.
  useEffect(() => {
    async function fetchPlaylistData() {
      try {
        const playlistData = await _api('browse/categories/focus/playlists');
        const playlistSet = playlistData.playlists.items;
        setPlaylists(playlistSet);
        getNewPlaylist(playlistSet);
      } catch (err) {
        _handleError(err);
      }
    }

    if (accessToken && !playlists.length) {
      fetchPlaylistData();
    }
  }, [_api, accessToken, _handleError, playlists, getNewPlaylist]);

  // Gather up the next set of tracks to play.
  useEffect(() => {
    if (playlistData) {
      const tracks = playlistData.tracks.items.map(item => item.track.uri);
      setTracks(tracks);
    }
  }, [playlistData]);

  // Update the pomodoro count cookie as pomodoros are completed.
  useEffect(() => {
    Cookie.set('pomodoroCount', pomodoroCount);
  }, [pomodoroCount]);

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
            <Timer isPlaying={isPlaying} pauseMusic={pauseMusic} onFinish={finishPomodoro}/>
            <Button isPlaying={isPlaying} onTogglePlayback={togglePlayback}/>
            <ProgressMeter pomodoroCount={pomodoroCount} isReset={isReset} />
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
