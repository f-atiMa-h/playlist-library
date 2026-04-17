import './App.css'
import { themes } from './themes';
import { useState, useEffect, useRef } from 'react';

function Playlist() {
  //  STATE 
  const [playlists, setPlaylists] = useState([]);
  const [songInput, setSongInput] = useState('');
  const [artistInput, setArtistInput] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [expandedPlaylistId, setExpandedPlaylistId] = useState(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const audioRef = useRef(null);

  //  API CALLS 
  const fetchSongs = async (query) => {
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`
      );
      const data = await res.json();
      return data.results || [];
    } catch (err) {
      console.error('iTunes fetch failed:', err);
      return [];
    }
  };

  //  THEME MANAGEMENT 
  const applyTheme = (themeName) => {
    const theme = themes[themeName];
    if (!theme) return;
    Object.entries(theme).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  };

  useEffect(() => {
    applyTheme('midnight');
  }, []);

  //  PERSISTENT STORAGE (window.storage) 
  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const result = await window.storage.get('playlists');
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          if (Array.isArray(parsed)) {
            setPlaylists(parsed);
          }
        }
      } catch (err) {
        console.error('Failed to load playlists:', err);
      }
    };
    loadPlaylists();
  }, []);

  useEffect(() => {
    const savePlaylists = async () => {
      try {
        await window.storage.set('playlists', JSON.stringify(playlists));
      } catch (err) {
        console.error('Failed to save playlists:', err);
      }
    };
    if (playlists.length > 0 || playlists.length === 0) {
      savePlaylists();
    }
  }, [playlists]);

  //  SEARCH & SUGGESTIONS (DEBOUNCED) 
  useEffect(() => {
    if (songInput.length < 2) {
      setSuggestions([]);
      return;
    }

    const delay = setTimeout(async () => {
      const data = await fetchSongs(songInput);
      setSuggestions(data.slice(0, 5));
    }, 400);

    return () => clearTimeout(delay);
  }, [songInput]);

  //  UTILITY FUNCTIONS 
  const secondsToMinuteSeconds = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  //  STATS (DERIVED FROM STATE) 
  const totalPlaylists = playlists.length;

  const totalSongs = playlists.reduce(
    (sum, pl) => sum + (pl.songs?.length || 0),
    0
  );

  const totalSeconds = playlists.reduce((sum, pl) => {
    return sum + pl.songs.reduce((s, song) => {
      if (!song.duration || !song.duration.includes(':')) return s;
      const [mins, secs] = song.duration.split(':').map(Number);
      return s + (mins * 60 || 0) + (secs || 0);
    }, 0);
  }, 0);

  //  SUGGESTION CLICK HANDLER 
  const handleSuggestionClick = (suggestion) => {
    setSongInput(suggestion.trackName);
    setArtistInput(suggestion.artistName);
    
    const durationSec = suggestion.trackTimeMillis
      ? Math.floor(suggestion.trackTimeMillis / 1000)
      : 0;

    setDurationInput(secondsToMinuteSeconds(durationSec));
    setPreviewUrl(suggestion.previewUrl || '');
    setSuggestions([]);
  };

  //  PLAYLIST CRUD 
  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;

    const newPlaylist = {
      id: Date.now(),
      name: newPlaylistName.trim(),
      songs: []
    };

    setPlaylists([...playlists, newPlaylist]);
    setNewPlaylistName('');
    setShowModal(false);
  };

  const handleDeletePlaylist = (id) => {
    setPlaylists(playlists.filter(pl => pl.id !== id));
  };

  const handleToggleExpand = (id) => {
    setExpandedPlaylistId(expandedPlaylistId === id ? null : id);
  };

  //  ADD SONG HANDLER 
  const handleAddSong = (e) => {
    e.preventDefault();

    if (!selectedPlaylistId) return;
    if (!songInput.trim() || !artistInput.trim() || !durationInput.trim()) return;

    const newSong = {
      id: Date.now(),
      title: songInput.trim(),
      artist: artistInput.trim(),
      duration: durationInput.trim(),
      preview: previewUrl || null
    };

    setPlaylists(playlists.map(pl =>
      pl.id === Number(selectedPlaylistId)
        ? { ...pl, songs: [...pl.songs, newSong] }
        : pl
    ));

    setSongInput('');
    setArtistInput('');
    setDurationInput('');
    setPreviewUrl('');
    setSuggestions([]);
  };

  //  AUDIO PLAYBACK 
  const handlePreview = (song) => {
    if (!song.preview) return;

    if (currentlyPlaying === song.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setCurrentlyPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(song.preview);
      audioRef.current = audio;

      audio.play().catch(() => {
        console.warn('Audio playback failed');
      });

      setCurrentlyPlaying(song.id);
      audio.onended = () => setCurrentlyPlaying(null);
    }
  };

  //  RENDER 
  return (
    <div className='container'>
      {/* HEADER */}
      <div className='header'>
        <div className='header-text'>
          <div className='header-title'>Playlist Library</div>
          <div className='header-sub'>Create your personalized playlist.</div>
        </div>

        <select className='theme-select' onChange={(e) => applyTheme(e.target.value)}>
          <option value='midnight'>Midnight</option>
          <option value='light'>Light</option>
        </select>
      </div>

      {/* STATS */}
      <div className='stats'>
        <div className='stats-card'>
          <div className='stat-card-label'>Total Playlists: </div>
          <div className='stat-card-value'>{totalPlaylists}</div>
        </div>

        <div className='stats-card'>
          <div className='stat-card-label'>Total Songs: </div>
          <div className='stat-card-value'>{totalSongs}</div>
        </div>

        <div className='stats-card'>
          <div className='stat-card-label'>Total Duration: </div>
          <div className='stat-card-value'>
            {totalSeconds === 0 ? '0s' : formatDuration(totalSeconds)}
          </div>
        </div>
      </div>

      {/* ADD SONGS FORM */}
      <div className='form-card'>
        <div className='form-title'>Add a Song</div>
        <form onSubmit={handleAddSong}>
          <div className='form-grid'>

            <div className='input-group'>
              <label>Add to Playlist</label>
              <select
                className='playlist-select'
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                required
              >
                <option value=''>Select a playlist...</option>
                {playlists.map(pl => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
            </div>

            <div className='input-group' style={{ position: 'relative' }}>
              <label htmlFor="song-title">Song Title</label>
              <input
                id="song-title"
                type='text'
                placeholder='Song name'
                value={songInput}
                onChange={(e) => setSongInput(e.target.value)}
                required
              />
              {suggestions.length > 0 && (
                <ul className='suggestions-dropdown'>
                  {suggestions.map((s) => (
                    <li key={s.trackId} onClick={() => handleSuggestionClick(s)}>
                      <span className='suggestion-title'>{s.trackName}</span>
                      <span className='suggestion-artist'>{s.artistName}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className='input-group'>
              <label htmlFor="artist-name">Artist Name</label>
              <input
                id="artist-name"
                type='text'
                placeholder='Artist name'
                value={artistInput}
                onChange={(e) => setArtistInput(e.target.value)}
                required
              />
            </div>

            <div className='input-group'>
              <label htmlFor="duration">Duration</label>
              <input
                id="duration"
                type='text'
                placeholder='2:30'
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                pattern='\d{1,2}:[0-5]\d'
                title='Use MM:SS format (e.g 2:30)'
                inputMode='text'
                maxLength='5'
                required
              />
            </div>

          </div>

          <button type='submit' className='btn-add'>Add to Playlist</button>
        </form>
      </div>

      {/* PLAYLISTS SECTION */}
      <div>
        <div className="playlist-header">
          <div className="playlist-title">Your Playlists</div>
          <button 
            type="button"
            className='btn-new-playlist' 
            onClick={() => setShowModal(true)}
          >
            + New Playlist
          </button>
        </div>

        <div className="song-list">
          {playlists.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎵</div>
              <div className="empty-state-text">
                No playlists yet.<br />
                Create your first playlist.
              </div>
            </div>
          ) : (
            playlists.map(pl => (
              <div key={pl.id} className="playlist-card">
                <div
                  className="playlist-card-header"
                  onClick={() => handleToggleExpand(pl.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="playlist-card-left">
                    <span className="playlist-card-arrow">
                      {expandedPlaylistId === pl.id ? '▾' : '▸'}
                    </span>
                    <span className="playlist-card-name">{pl.name}</span>
                  </div>
                  <div className="playlist-card-right">
                    <span className="playlist-card-count">
                      {pl.songs.length} {pl.songs.length === 1 ? 'song' : 'songs'}
                    </span>
                    <button
                      type="button"
                      className="btn-delete-playlist"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(pl.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {expandedPlaylistId === pl.id && (
                  <div className="playlist-card-body">
                    {pl.songs.length === 0 ? (
                      <div className="playlist-card-empty">
                        No songs yet. Use the form above to add songs.
                      </div>
                    ) : (
                      pl.songs.map((song) => (
                        <div key={song.id} className="song-item">
                          <span className="song-item-title">{song.title}</span>
                          <span className="song-item-artist">{song.artist}</span>
                          <span className="song-item-duration">{song.duration}</span>
                          {song.preview && (
                            <button
                              type="button"
                              className={`btn-preview ${currentlyPlaying === song.id ? 'playing' : ''}`}
                              onClick={() => handlePreview(song)}
                            >
                              {currentlyPlaying === song.id ? '■' : '▶'}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* CREATE PLAYLIST MODAL */}
        {showModal && (
          <div className='modal-overlay' onClick={() => setShowModal(false)}>
            <div className='modal' onClick={(e) => e.stopPropagation()}>
              <div className='modal-title'>New Playlist</div>
              <input
                className='modal-input'
                type='text'
                placeholder='Playlist name...'
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                autoFocus
              />
              <div className='modal-actions'>
                <button 
                  type="button"
                  className='btn-cancel' 
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  className='btn-confirm' 
                  onClick={handleCreatePlaylist}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Playlist;