import express from "express";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./utils/error.js";
import { config } from './utils/config.js';
import { configurationStorage } from "./middleware/upload.js";

// Import request handlers
import * as track from './requestHandlers/track.js';
import * as artist from './requestHandlers/artist.js';
import * as album from './requestHandlers/album.js';

// Import validation middleware
import { createValidateParams, createValidateBody, createValidateQuery } from './middleware/middleware.js';

// Import validation schemas
import { transformFormData, TrackParams, TrackCreateBody, TrackConnectBody, TrackQuery } from './validation/track.js';
import { ArtistParams, ArtistCreateBody, ArtistQuery } from './validation/artist.js';
import { AlbumParams, AlbumCreateBody, AlbumQuery } from './validation/album.js';

const app = express();
const port = config.port;
const multer = configurationStorage();

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================

app.use((req: Request, res: Response, next: NextFunction) => {
	res.header('Access-Control-Expose-Headers', 'X-Total-Count');
	next();
});
app.use(express.json());

// ========================================
// ROUTES DEFINITION
// ========================================

/**
 * Health check endpoint
 */
app.get("/", (req: Request, res: Response) => {
	res.json({
		message: "Music Streaming API",
		version: "1.0.0",
		status: "running"
	});
});

// ========================================
// TRACKS ROUTES
// ========================================

app.route("/tracks")
	.get(createValidateQuery(TrackQuery), track.get_all)
	.post(multer.single("file"), transformFormData, createValidateBody(TrackCreateBody), track.create_one);

app.route("/tracks/:track_id")
	.all(createValidateParams(TrackParams))
	.get(track.get_one)
	.delete(track.delete_one)
	.patch(createValidateBody(TrackConnectBody), track.connect_one);

app.route("/tracks/:track_id/stream")
	.all(createValidateParams(TrackParams))
	.get(track.stream_one)

// ========================================
// ARTISTS ROUTES
// ========================================

app.route("/artists")
	.get(createValidateQuery(ArtistQuery), artist.get_all)
	.post(createValidateBody(ArtistCreateBody), artist.create_one);

app.route("/artists/:artist_id")
	.all(createValidateParams(ArtistParams))
	.get(artist.get_one)
	.delete(artist.delete_one);

app.route("/artists/:artist_id/tracks")
	.all(createValidateParams(ArtistParams))
	.get(artist.get_tracks);

app.route("/artists/:artist_id/albums")
	.all(createValidateParams(ArtistParams))
	.get(artist.get_albums);

// ========================================
// ALBUMS ROUTES
// ========================================

app.route("/albums")
	.get(createValidateQuery(AlbumQuery), album.get_all)
	.post(createValidateBody(AlbumCreateBody), album.create_one);

app.route("/albums/:album_id")
	.all(createValidateParams(AlbumParams))
	.get(album.get_one)
	.delete(album.delete_one);

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
	console.error('Error occurred:', err);

	const status = err.status || 500;
	const message = err.message || 'Internal Server Error';

	res.status(status).json({
		error: message,
		...(process.env.NODE_ENV === 'development' && { stack: err.stack })
	});
});

app.use((req: Request, res: Response) => {
	res.status(404).json({ error: 'Route not found' });
});

// ========================================
// SERVER STARTUP
// ========================================

app.listen(port, () => {
	console.log(`🎵 Music Streaming API listening on port ${port}`);
	console.log(`📖 API Documentation: http://localhost:${port}`);
});

export default app;