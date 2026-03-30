import './App.css'
import { themes } from './themes';
import { useState, useEffect, useRef } from 'react';

function Playlist() {

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
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null)

  // to change the themes
  const applyTheme = (themeName) => {
    const theme = themes[themeName];
    if (theme) {
      Object.entries(theme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    }

  }

  useEffect(() => {
    applyTheme('midnight'); // apply midnight theme on load
  }, []);

  // For the STATS bar
  const totalPlaylists = playlists.length;

  const totalSongs = playlists.reduce((sum, pl) => sum + pl.songs.length, 0);

  const totalSeconds = playlists.reduce((sum, pl) => {
    return sum + pl.songs.reduce((s, song) => {
      const [mins, secs] = song.duration.split(':').map(Number);
      return s + mins * 60 + secs;
    }, 0);
  }, 0);

  // Converts total seconds into a readable format e.g 1h 23m 45s
  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Used persistent storage(useEffect) for loading and saving the playlists

  // Load playlists on mount
  useEffect(() => {
    const load = async () => {
      try {
        const result = await window.storage.get('playlists');
        if (result) setPlaylists(JSON.parse(result.value));
      } catch {
        setPlaylists([]);
      }
    };
    load();
  }, []);

  // Save playlists whenever they change
  useEffect(() => {
    const save = async () => {
      try {
        await window.storage.set('playlists', JSON.stringify(playlists));
      } catch (err) {
        console.error('Failed to save:', err);
      }
    };
    save();
  }, [playlists]);

  // the debounce(giving suggestions from the API after every keystroke) LOGIC
  useEffect(() => {
    if (songInput.length < 2) {
      setSuggestions([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://corsproxy.io/?https://api.deezer.com/search?q=${encodeURIComponent(songInput)}`
        );
        const data = await res.json();
        setSuggestions(data.data.slice(0, 3));// It will suggest the top 3 results
      } catch (err) {
        console.error('Deezer fetch failed:', err);
      }
    }, 400);
    return () => clearTimeout(delay);  // cleanup. cancels previous timer on each keystroke
  }, [songInput]);

  //to convert Deezer's duration, because it comes in seconds
  const secondsToMinuteSeconds = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  //when a user clicks the suggestion
  const handleSuggestionClick = (suggestion) => {
    setSongInput(suggestion.title);
    setArtistInput(suggestion.artist.name);
    setDurationInput(secondsToMinuteSeconds(suggestion.duration));
    setPreviewUrl(suggestion.preview);
    setSuggestions([]); // close dropdown
  };

  //  the 'create' playlist logic
  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;

    const newPlaylist = {
      // a special id(the date when it was created)
      id: Date.now(),
      name: newPlaylistName.trim(),
      songs: []
    };

    setPlaylists([...playlists, newPlaylist]);
    setNewPlaylistName('');
    setShowModal(false);
  }


  // to delete playlist logic
  const handleDeletePlaylist = (id) => {
    setPlaylists(playlists.filter(pl => pl.id !== id));
  };

  //toggle to expand the card
  const handleToggleExpand = (id) => {
    setExpandedPlaylistId(expandedPlaylistId === id ? null : id);
  };

  // Add to playlist logic
  const handleAddSong = (e) => {
    e.preventDefault();

    if (!selectedPlaylistId) return; // no playlist selected
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

    // clear form after adding
    setSongInput('');
    setArtistInput('');
    setDurationInput('');
    setPreviewUrl('');
    setSuggestions([]);
  };

  //for the audio snippet
  const audioRef = useRef(null);

  //Play/Stop logic
  const handlePreview = (song) => {
    if (!song.preview) return;

    if (currentlyPlaying === song.id) {
      // already playing — stop it
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentlyPlaying(null);
    } else {
      // play new song
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(song.preview);
      audioRef.current.play();
      setCurrentlyPlaying(song.id);

      // auto-reset when preview ends
      audioRef.current.onended = () => setCurrentlyPlaying(null);
    }
  };



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

      {/* ADD SONGS */}

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
              <label htmlFor="title">Song Title</label>
              <input
                type='text'
                placeholder='Song name'
                value={songInput}
                onChange={(e) => setSongInput(e.target.value)}
                required
              />
              {suggestions.length > 0 && (
                <ul className='suggestions-dropdown'>
                  {suggestions.map((s) => (
                    <li key={s.id} onClick={() => handleSuggestionClick(s)}>
                      <span className='suggestion-title'>{s.title}</span>
                      <span className='suggestion-artist'>{s.artist.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className='input-group'>
              <label htmlFor="artist">Artist name</label>
              <input
                type='text'
                placeholder='Artist name'
                value={artistInput}
                onChange={(e) => setArtistInput(e.target.value)}
                required
              />
            </div>

            <div className='input-group'>
              <label htmlFor="duration">Song's duration</label>
              {/*pattern: using regex like a ruleset the value must follow. It should accept 1/2 digits, it must have a :, the first digit of seconds must be 0-5.*/}
              {/*inputmode: hints to mobile devices what keyboard to show. In this case the normal "text" keyboard */}
              {/* title: error message shown to the user when the pattern fails */}
              <input
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

      {/* SEARCH BAR */}

      {/* <div className='search-bar'>
        <input
          type='search'
          placeholder='Search your songs'
        />
      </div> */}

      {/* PLAYLISTS */}
      <div>
        <div className="playlist-header">
          <div className="playlist-title">Your Playlists</div>
          <button className='btn-new-playlist' onClick={() => setShowModal(true)}>
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
                      className="btn-delete-playlist"
                      onClick={(e) => {
                        e.stopPropagation(); // prevents card from toggling when X is clicked
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
                      pl.songs.map((song, index) => (
                        <div key={index} className="song-item">
                          <span className="song-item-title">{song.title}</span>
                          <span className="song-item-artist">{song.artist}</span>
                          <span className="song-item-duration">{song.duration}</span>
                          {song.preview && (
                            <button
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
        {/* MODAL */}
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
                <button className='btn-cancel' onClick={() => setShowModal(false)}>Cancel</button>
                <button className='btn-confirm' onClick={handleCreatePlaylist}>Create</button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default Playlist;