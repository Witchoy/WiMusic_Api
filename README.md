# WiMusic API

A modern music streaming API built with Node.js, Express, TypeScript, and Prisma. This API provides endpoints for managing and streaming music tracks, artists, and albums.

## 🎵 Features

- **Track Management**: List, retrieve, and stream music tracks
- **Artist Management**: Browse artists and their associated tracks/albums
- **Album Management**: Access album information and metadata
- **Music Streaming**: Stream audio files with proper security validation
- **Database Integration**: SQLite database with Prisma ORM
- **Type Safety**: Full TypeScript support with runtime validation
- **Pagination Support**: Built-in pagination for all list endpoints

## 🚀 API Endpoints

### Health Check
- `GET /` - API health check and version info

### Tracks
- `GET /tracks` - Get all tracks (supports pagination: `?skip=0&take=10`)
- `GET /tracks/:track_id` - Get a specific track with artist and album info
- `GET /tracks/:track_id/stream` - Stream a track (audio file)

### Artists
- `GET /artists` - Get all artists (supports pagination)
- `GET /artists/:artist_id` - Get a specific artist
- `GET /artists/:artist_id/tracks` - Get all tracks by an artist
- `GET /artists/:artist_id/albums` - Get all albums by an artist

### Albums
- `GET /albums` - Get all albums (supports pagination)
- `GET /albums/:album_id` - Get a specific album

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Witchoy/WiMusic_Api.git
   cd WiMusic_Api/streaming-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the environment file (already provided)
   # Update .env file if needed
   ```

4. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

5. **Set up the database**
   ```bash
   # Push schema to database
   npx prisma db push
   
   # Seed the database with sample data
   npx prisma db seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## 📚 Usage Examples

### Get all tracks
```bash
curl http://localhost:3000/tracks
```

### Get a specific track with relationships
```bash
curl http://localhost:3000/tracks/1
```

### Stream a track
```bash
curl http://localhost:3000/tracks/1/stream --output song.mp3
```

### Pagination example
```bash
curl "http://localhost:3000/tracks?skip=0&take=5"
```

## 🗄️ Database Schema

The API uses SQLite with the following main entities:

- **Track**: Music tracks with title and file path
- **Artist**: Music artists
- **Album**: Music albums  
- **ArtistTrack**: Many-to-many relationship between artists and tracks
- **TrackAlbum**: Many-to-many relationship between tracks and albums
- **ArtistAlbum**: Many-to-many relationship between artists and albums

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm test` - Run tests (currently not implemented)

### Database Operations
See [PrismaCommands.md](PrismaCommands.md) for detailed Prisma commands.

### Project Structure
```
streaming-api/
├── src/
│   ├── index.ts                 # Main application entry point
│   ├── requestHandlers/         # Route handlers
│   │   ├── track.ts            # Track-related endpoints
│   │   ├── artist.ts           # Artist-related endpoints
│   │   └── album.ts            # Album-related endpoints
│   └── utils/                  # Utility modules
│       ├── config.ts           # Configuration management
│       ├── db.ts               # Database connection
│       └── error.ts            # Error handling
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Database seeding script
├── media/                      # Audio files directory
└── package.json
```

## 🏗️ Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM
- **Validation**: Superstruct for request validation
- **Development**: tsx for TypeScript execution

## 📝 Configuration

The API uses environment variables for configuration:
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - Database connection string
- Media files are stored in the `./media` directory by default

## 🔒 Security Features

- File path validation for streaming endpoints
- Input parameter validation with runtime type checking
- Proper error handling and status codes
- CORS headers configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🎯 API Response Format

All endpoints return JSON responses with consistent structure:

### Success Response
```json
{
  "tracks": [...],           // For list endpoints
  "track": {...},            // For single item endpoints
  "artists": [...],          // etc.
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Additional details if available"
}
```

### Pagination Headers
List endpoints include a `X-Total-Count` header with the total number of items available.