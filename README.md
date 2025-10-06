# WiMusic API

A music streaming API built with Node.js, Express, TypeScript, and Prisma. Upload MP3 files, manage tracks/artists/albums/genres/playlists, and stream music.

## Features

- Upload and manage MP3 files with metadata extraction
- Stream music with range request support
- Manage tracks, artists, albums, genres, and playlists
- SQLite database with Prisma ORM
- TypeScript with runtime validation using Superstruct
- Pagination support across all endpoints
- Security headers with Helmet
- File upload handling with Multer

## API Endpoints

### 🎵 **Tracks**
- `GET /tracks` - List all tracks with pagination and filtering
  - Query params: `title`, `page`, `pageSize`
- `POST /tracks` - Create track with MP3 upload (multipart/form-data)
- `GET /tracks/:track_id` - Get single track with details
- `PATCH /tracks/:track_id` - Update track metadata and connections
- `DELETE /tracks/:track_id` - Delete track and associated file
- `GET /tracks/:track_id/stream` - Stream track with range request support

### 🎤 **Artists**
- `GET /artists` - List all artists with pagination
  - Query params: `name`, `page`, `pageSize`
- `POST /artists` - Create new artist
- `GET /artists/:artist_id` - Get artist details
- `DELETE /artists/:artist_id` - Delete artist
- `GET /artists/:artist_id/tracks` - Get all tracks by artist
- `GET /artists/:artist_id/albums` - Get all albums by artist

### 💿 **Albums**
- `GET /albums` - List all albums with pagination
  - Query params: `title`, `page`, `pageSize`
- `POST /albums` - Create new album
- `GET /albums/:album_id` - Get album with tracks and artists
- `DELETE /albums/:album_id` - Delete album

### 🎭 **Genres**
- `GET /genres` - List all genres with pagination
  - Query params: `name`, `page`, `pageSize`
- `POST /genres` - Create new genre
- `GET /genres/:genre_id` - Get genre details
- `DELETE /genres/:genre_id` - Delete genre

### 📋 **Playlists**
- `GET /playlists` - List all playlists with pagination
  - Query params: `name`, `page`, `pageSize`
- `POST /playlists` - Create new playlist
- `GET /playlists/:playlist_id` - Get playlist with tracks
- `DELETE /playlists/:playlist_id` - Delete playlist

### ❤️ **Health Check**
- `GET /` - API status and version info

## Request/Response Examples

### Upload MP3 File

**Postman:** `POST /tracks` with form-data:
- `file` (File): MP3 file
- `title` (Text): Song title  
- `artist_id` (Text): Artist ID
- `album_id` (Text): Album ID (optional)
- `genre_id` (Text): Genre ID (optional)

**cURL:**
```bash
curl -X POST http://localhost:3000/tracks \
  -F "file=@song.mp3" \
  -F "title=My Song" \
  -F "artist_id=1" \
  -F "album_id=1"
```

### Create Artist
```bash
curl -X POST http://localhost:3000/artists \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe"}'
```

### Create Album
```bash
curl -X POST http://localhost:3000/albums \
  -H "Content-Type: application/json" \
  -d '{"title": "Greatest Hits", "artist_id": 1}'
```

### Create Playlist
```bash
curl -X POST http://localhost:3000/playlists \
  -H "Content-Type: application/json" \
  -d '{"name": "My Favorites", "trackIds": [1, 2, 3]}'
```

### Pagination Example
```bash
# Get tracks with pagination
curl "http://localhost:3000/tracks?page=1&pageSize=10"

# Filter albums by title
curl "http://localhost:3000/albums?title=Greatest&page=1&pageSize=5"
```

## Response Format

### Success Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalCount": 25,
    "totalPages": 3
  }
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

## Setup

```bash
git clone https://github.com/Witchoy/WiMusic_Api.git
cd WiMusic_Api/streaming-api
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

Server runs on `http://localhost:3000`

## Environment Variables

Create a `.env` file:
```env
DATABASE_URL="file:./dev.db"
PORT=3000
NODE_ENV=development
```

## Examples

```bash
# Get all tracks
curl http://localhost:3000/tracks

# Stream a track  
curl http://localhost:3000/tracks/1/stream

# Get artist with their albums
curl http://localhost:3000/artists/1/albums

# Upload new track
curl -X POST http://localhost:3000/tracks \
  -F "file=@song.mp3" \
  -F "title=New Song" \
  -F "artist_id=1"

# Create a genre
curl -X POST http://localhost:3000/genres \
  -H "Content-Type: application/json" \
  -d '{"name": "Rock"}'
```

## Tech Stack

- **Backend**: Node.js + TypeScript + Express.js
- **Database**: SQLite + Prisma ORM  
- **File Upload**: Multer with UUID naming
- **Validation**: Superstruct for runtime validation
- **Security**: Helmet for security headers
- **Audio**: Range request support for streaming

## Project Structure

```
src/
├── index.ts              # Main app and routes
├── middleware/           # Validation and upload middleware
├── requestHandlers/      # Route handlers (CRUD operations)
├── utils/               # Config, database, and error utilities
└── validation/          # Superstruct schemas
```

## License

View [LICENCE.md](LICENCE.md)
