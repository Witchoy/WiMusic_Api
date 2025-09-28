# WiMusic API

A music streaming API built with Node.js, Express, TypeScript, and Prisma. Upload MP3 files, manage tracks/artists/albums, and stream music.

## Features

- Upload and manage MP3 files
- Stream music
- Manage tracks, artists, and albums
- SQLite database with Prisma ORM
- TypeScript with runtime validation
- Pagination support

## API Endpoints

**Tracks**
- `GET /tracks` - List all tracks (with pagination)
- `POST /tracks` - Create track with MP3 upload
- `GET /tracks/:id` - Get single track
- `DELETE /tracks/:id` - Delete track
- `GET /tracks/:id/stream` - Stream track

**Artists**
- `GET /artists` - List all artists
- `POST /artists` - Create artist
- `GET /artists/:id` - Get artist with tracks/albums

**Albums**
- `GET /albums` - List all albums
- `POST /albums` - Create album
- `GET /albums/:id` - Get album details

## Upload MP3 Files

**Postman:** `POST /tracks` with form-data:
- `file` (File): MP3 file
- `title` (Text): Song title  
- `artist_id` (Text): Artist ID

**cURL:**
```bash
curl -X POST http://localhost:3000/tracks \
  -F "file=@song.mp3" \
  -F "title=My Song" \
  -F "artist_id=1"
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

## Examples

```bash
# Get all tracks
curl http://localhost:3000/tracks

# Stream a track  
curl http://localhost:3000/tracks/1/stream

# Upload new track
curl -X POST http://localhost:3000/tracks \
  -F "file=@song.mp3" \
  -F "title=New Song" \
  -F "artist_id=1"
```

## Tech Stack

- Node.js + TypeScript + Express
- SQLite + Prisma ORM  
- Multer (file uploads)
- Superstruct (validation)

## License

ISC