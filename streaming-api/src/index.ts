import express from "express";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./utils/error.js";
import { config } from './utils/config.js';
import { configurationStorage } from "./middleware/upload.js";

// Import request handlers
import * as track from './requestHandlers/track.js';
import * as artist from './requestHandlers/artist.js';
import * as album from './requestHandlers/album.js';

// Import validation schemas
import { createValidateBody, createValidateParams, createValidateQuery } from "./middleware/middleware.js";
import { TrackCreationData, TrackGetAllQuery, TrackParams, TrackUpdateData } from "./validation/track.js";
import { ArtistCreationData, ArtistGetAllQuery, ArtistParams } from "./validation/artist.js";
import { AlbumCreationData, AlbumGetAllQuery, AlbumParams,  } from "./validation/album.js";

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

// routes
app.route("/tracks")
    .get(createValidateQuery(TrackGetAllQuery), track.get_all)
    .post(multer.single("file"), createValidateBody(TrackCreationData), track.create_one);

app.route("/tracks/:track_id")
    .get(createValidateParams(TrackParams), track.get_one)
    .patch(createValidateParams(TrackParams), createValidateBody(TrackUpdateData), track.connect_one)
    .delete(createValidateParams(TrackParams), track.delete_one);

app.route("/tracks/:track_id/stream")
    .get(createValidateParams(TrackParams), track.stream_one);

// ========================================
// ARTISTS ROUTES
// ========================================

app.route("/artists")
	.get(createValidateQuery(ArtistGetAllQuery), artist.get_all)
	.post(createValidateBody(ArtistCreationData), artist.create_one);

app.route("/artists/:artist_id")
	.get(createValidateParams(ArtistParams), artist.get_one)
	.delete(createValidateParams(ArtistParams), artist.delete_one);

app.route("/artists/:artist_id/tracks")
	.get(createValidateParams(ArtistParams), artist.get_tracks);

app.route("/artists/:artist_id/albums")
	.get(createValidateParams(ArtistParams), artist.get_albums);

// ========================================
// ALBUMS ROUTES
// ========================================

app.route("/albums")
	.get(createValidateQuery(AlbumGetAllQuery), album.get_all)
	.post(createValidateBody(AlbumCreationData), album.create_one);

app.route("/albums/:album_id")
	.get(createValidateParams(AlbumParams), album.get_one)
	.delete(createValidateParams(AlbumParams), album.delete_one);

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