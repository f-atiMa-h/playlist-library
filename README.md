# Playlist Library
## Project Overview

Playlist Library is a React single-page application that lets users create named playlists, search for songs via the Deezer API with autocomplete suggestions, add songs to playlists, and play 30-second audio previews. All data is saved automatically using persistent artifact storage, so playlists survive across sessions.

The project started as a simple song tracker and evolved into a full playlist management library through a series of deliberate design decisions made during development.

## Technology Stack
### React
React was chosen as the UI framework because it makes building interactive, stateful interfaces straightforward. Its component model and hooks system (useState, useEffect, useRef) make it easy to manage complex state like playlists, songs, audio playback, and theme switching — all within a single component.

### Deezer API
Deezer was chosen for three reasons:
. Returns structured data including title, artist name, and duration in seconds — everything needed to populate the form automatically
. •Returns 30-second audio preview URLs for most tracks — enabling the snippet playback feature.
. No API key required for basic search.

### Artifact Persistent Storage

## Features Built
. Theme Switching.
. Stats Bar.
. Playlist Creation with a Modal.
. Song Autocomplete.
. Adding Songs to a Playlist.
.  Expandable Playlist Cards.
. Empty States.
. Audio Preview Playback.

## Vercel
{[text](https://playlist-library.vercel.app/)}

