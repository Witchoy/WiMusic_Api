import express from "express";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./utils/error.js";
import { assert, object, optional, refine, string } from "superstruct";
import validator from "validator";
import { config } from './utils/config.js';

// Import request handlers
import * as track from './requestHandlers/track.js';
import * as artist from './requestHandlers/artist.js';
import * as album from './requestHandlers/album.js';

const { isInt } = validator;
const app = express();
const port = config.port;

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================

app.use((req: Request, res: Response, next: NextFunction) => {
	res.header('Access-Control-Expose-Headers', 'X-Total-Count');
	next();
});
app.use(express.json());

// ========================================
// VALIDATION SCHEMAS
// ========================================

export const ReqParams = object({
	artist_id: optional(refine(string(), 'int', (value) => isInt(value))),
	track_id: optional(refine(string(), 'int', (value) => isInt(value))),
	album_id: optional(refine(string(), 'int', (value) => isInt(value)))
});

const validateParams = (req: Request, res: Response, next: NextFunction) => {
	try {
		assert(req.params, ReqParams);
		next();
	} catch (error) {
		res.status(400).json({
			error: 'Invalid parameters',
			details: error instanceof Error ? error.message : 'Validation failed'
		});
	}
};

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
	.get(track.get_all);

app.route("/tracks/:track_id")
	.all(validateParams)
	.get(track.get_one);

app.route("/tracks/:track_id/stream")
	.all(validateParams)
	.get(track.stream_one)

// ========================================
// ARTISTS ROUTES
// ========================================

app.route("/artists")
	.get(artist.get_all);

app.route("/artists/:artist_id")
	.all(validateParams)
	.get(artist.get_one);

app.route("/artists/:artist_id/tracks")
	.all(validateParams)
	.get(artist.get_tracks);

app.route("/artists/:artist_id/albums")
	.all(validateParams)
	.get(artist.get_albums);

// ========================================
// ALBUMS ROUTES
// ========================================

app.route("/albums")
	.get(album.get_all);

app.route("/albums/:album_id")
	.all(validateParams)
	.get(album.get_one);

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