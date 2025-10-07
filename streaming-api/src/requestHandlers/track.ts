import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Prisma } from "@prisma/client"
import type { Request, Response } from "express";
import { promises as fs } from 'fs';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError, InternalServerError, BadRequestError } from "../utils/error.js";
import { prisma } from "../utils/db.js";
import { config } from '../utils/config.js';
import path from 'path';

const MEDIA_ROOT = path.resolve(config.mediaRoot);

// Validate that file path is within allowed media directory
const validateFilePath = (filePath: string): boolean => {
    const resolvedPath = path.resolve(filePath);
    return resolvedPath.startsWith(MEDIA_ROOT);
};

// Get all tracks with optional pagination (skip/take)
export async function get_all(req: Request, res: Response) {
    try {
        const filter: Prisma.TrackWhereInput = {};
        const { title, skip, track} = req.query;

        // Filter by title if specified in the query
        if (title) {
            filter.title = { contains: String(title) };
        }

        const tracks = await prisma.track.findMany({
            // skip: skip ? Number(skip) : undefined,
            // take: skip ? Number(skip) : undefined,
            where: filter,
            orderBy: { title: 'asc' },
            include: {
                artists: { include: { artist: { select: { id: true, name: true } } } },
                albums: { include: { album: { select: { id: true, title: true } } } }
            }
        });

        const trackCount = await prisma.track.count({
            where: filter
        });
        res.set('X-Total-Count', trackCount.toString());

        // Format tracks to include artist names and album titles 
        const formattedTracks = tracks.map(track => ({
            ...track,
            artists: track.artists.map(a => a.artist),
            albums: track.albums.map(a => a.album)
        }));

        res.status(200).json({ tracks: formattedTracks });
    } catch (err: unknown) {
        const internalError = new InternalServerError('Failed to fetch tracks');
        console.error('Error fetching tracks:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Get a single track by ID
export async function get_one(req: Request, res: Response) {
    try {
        const track = await prisma.track.findUnique({
            where: { id: Number(req.params.track_id) },
            include: {
                artists: { include: { artist: { select: { id: true, name: true } } } },
                albums: { include: { album: { select: { id: true, title: true } } } }
            }
        });
        if (!track) {
            throw new NotFoundError(`Track ${req.params.track_id} not found`);
        }
        // Format track to include artist names and album titles
        const formattedTrack = {
            ...track,
            artists: track.artists.map(a => a.artist),
            albums: track.albums.map(a => a.album)
        };

        res.status(200).json({ track: formattedTrack });
    } catch (err: unknown) {
        if (err instanceof NotFoundError) {
            return res.status(err.status!).json({ error: err.message });
        }
        
        const internalError = new InternalServerError('Failed to fetch track');
        console.error('Error fetching track:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Create a single track and connect it to the artist and album
export async function create_one(req: Request, res: Response) {
    try {
        if (!req.file) {
            throw new BadRequestError("MP3 file is required");
        }

        const { title, artist_id, album_id, genre_id, duration, hasAlbum } = req.body;
        const filePath = req.file.path;

        // Validate required fields
        const artistId = Number(artist_id);
        if (isNaN(artistId) || artistId <= 0) {
            throw new BadRequestError("Invalid artist_id");
        }

        // Parse optional album ID
        let albumId: number | undefined;
        if (hasAlbum === 'true' && album_id) {
            albumId = Number(album_id);
            if (isNaN(albumId) || albumId <= 0) {
                throw new BadRequestError("Invalid album_id");
            }
        }

        // Parse optional genre IDs
        let genreIds: number[] = [];
        if (genre_id) {
            genreIds = Array.isArray(genre_id) ? genre_id.map(Number) : [Number(genre_id)];
            if (genreIds.some(id => isNaN(id) || id <= 0)) {
                throw new BadRequestError("Invalid genre_id");
            }
        }

        // Create track with all relationships in transaction
        const createdTrack = await prisma.$transaction(async (tx) => {
            // Validate artist exists
            const artist = await tx.artist.findUnique({ where: { id: artistId } });
            if (!artist) {
                throw new NotFoundError(`Artist with id ${artistId} not found`);
            }

            // Validate album exists if specified
            if (albumId) {
                const album = await tx.album.findUnique({ where: { id: albumId } });
                if (!album) {
                    throw new NotFoundError(`Album with id ${albumId} not found`);
                }
            }

            // Create file record
            const newFile = await tx.file.create({
                data: {
                    filename: path.basename(filePath),
                    path: filePath,
                    mimeType: req.file!.mimetype,
                    size: req.file!.size,
                    uploadedAt: new Date()
                }
            });

            // Create track
            const newTrack = await tx.track.create({
                data: {
                    title,
                    duration: duration ? Number(duration) : null,
                    fileId: newFile.id
                }
            });

            // Add artist relationship
            await tx.artistTrack.create({
                data: { trackId: newTrack.id, artistId }
            });

            // Add album relationship if specified
            if (albumId) {
                const lastTrackInAlbum = await tx.trackAlbum.findFirst({
                    where: { albumId },
                    orderBy: { position: 'desc' },
                    select: { position: true }
                });
                const nextPosition = (lastTrackInAlbum?.position ?? 0) + 1;

                await tx.trackAlbum.create({
                    data: { trackId: newTrack.id, albumId, position: nextPosition }
                });
            }

            // Add genre relationships if provided
            if (genreIds.length > 0) {
                await Promise.all(
                    genreIds.map(genreId => 
                        tx.trackGenre.create({
                            data: { trackId: newTrack.id, genreId }
                        })
                    )
                );
            }

            // Return complete track data
            return tx.track.findUnique({
                where: { id: newTrack.id },
                include: {
                    file: true,
                    artists: { include: { artist: true } },
                    albums: { include: { album: true } }
                }
            });
        });

        res.status(201).json({ track: createdTrack });
    } catch (err: unknown) {
        // Clean up uploaded file if any operation fails
        if (req.file?.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Failed to clean up uploaded file:', unlinkError);
            }
        }

        if (err instanceof BadRequestError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof NotFoundError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2003') {
            const notFoundError = new NotFoundError('Artist or Album not found');
            return res.status(notFoundError.status!).json({ error: notFoundError.message });
        }

        const internalError = new InternalServerError('Failed to create track');
        console.error('Error creating track:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Connect a single track to an album
export async function connect_one(req: Request, res: Response) {
    try {

        const trackId = req.params.track_id;
        const albumId = req.body.album_id;

        // Use transaction to ensure atomicity
        const trackAlbum = await prisma.$transaction(async (tx) => {
            // Get the highest position for this album
            const lastTrack = await tx.trackAlbum.findFirst({
                where: { albumId: albumId },
                orderBy: { position: 'desc' },
                select: { position: true }
            });

            const nextPosition = (lastTrack?.position ?? 0) + 1;

            // Create the relationship
            return await tx.trackAlbum.create({
                data: {
                    trackId: Number(trackId),
                    albumId: albumId,
                    position: nextPosition
                }
            });
        });

        res.status(201).json({
            message: "Track added to album successfully",
            trackId: trackId,
            albumId: albumId,
            position: trackAlbum.position
        });

    } catch (err: unknown) {
        if (err instanceof NotFoundError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof ConflictError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof PrismaClientKnownRequestError) {
            if (err.code === 'P2003') {
                // Foreign key constraint failed
                const notFoundError = new NotFoundError('Track or Album not found');
                return res.status(notFoundError.status!).json({ error: notFoundError.message });
            }
            if (err.code === 'P2002') {
                // Unique constraint failed
                const conflictError = new ConflictError('Track is already connected to this album');
                return res.status(conflictError.status!).json({ error: conflictError.message });
            }
        }

        const internalError = new InternalServerError('Failed to connect track to album');
        console.error('Error connecting track to album:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Delete a single track
export async function delete_one(req: Request, res: Response) {
    try {
        const trackId = Number(req.params.track_id);

        // Get track with file info, then delete in transaction
        const deletedTrack = await prisma.$transaction(async (tx) => {
            const track = await tx.track.findUnique({
                where: { id: trackId },
                include: { file: true }
            });

            if (!track) {
                throw new NotFoundError('Track not found');
            }

            // Delete the track (cascade handles relationships)
            await tx.track.delete({
                where: { id: trackId }
            });

            // Delete the File record if it exists
            if (track.file) {
                await tx.file.delete({
                    where: { id: track.file.id }
                });
            }

            return track;
        });

        // After successful database deletion, delete physical file
        if (deletedTrack.file) {
            try {
                await fs.unlink(deletedTrack.file.path);
            } catch (unlinkError) {
                console.error('Failed to delete file from disk:', unlinkError);
            }
        }

        res.status(204).send();
    } catch (err: unknown) {
        if (err instanceof NotFoundError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
            const notFoundError = new NotFoundError('Track not found');
            return res.status(notFoundError.status!).json({ error: notFoundError.message });
        }

        const internalError = new InternalServerError('Failed to delete track');
        console.error('Error deleting track:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Stream a single track by ID with improved error handling and security
export async function stream_one(req: Request, res: Response): Promise<void> {
    try {
        // Find track in database
        const track = await prisma.track.findUnique({
            where: { id: Number(req.params.track_id) },
        });

        // Check if track exists
        if (!track) {
            throw new NotFoundError('Track not found');
        }

        // Check if track.fileId is valid
        if (track.fileId === null) {
            throw new NotFoundError('Track file not associated with a file');
        }

        // Fetch the file relation for the track
        const file = await prisma.file.findUnique({
            where: { id: track.fileId },
        });

        if (!file || !file.path) {
            throw new NotFoundError('Track file not found');
        }
        const trackFilePath = file.path;

        // Check if file path exists in track record
        if (!trackFilePath) {
            throw new InternalServerError('Track file path not found');
        }

        // Security check: validate file path is within allowed directory
        if (!validateFilePath(trackFilePath)) {
            throw new ForbiddenError('Access denied');
        }

        // Check if file exists on filesystem
        try {
            await fs.access(trackFilePath);
        } catch {
            throw new NotFoundError('Audio file not found on server');
        }

        // Get file stats
        const stat = await fs.stat(trackFilePath);
        const range = req.headers.range;

        let readStream;

        if (range !== undefined) {
            // Handle range request (partial content)
            const parts = range.replace(/bytes=/, "").split("-");
            const partialStart = parts[0];
            const partialEnd = parts[1];

            // Validate range parts
            const startNum = partialStart !== undefined ? Number(partialStart) : NaN;
            const endNum = partialEnd !== undefined ? Number(partialEnd) : NaN;

            if ((isNaN(startNum) && partialStart && partialStart.length > 1) ||
                (isNaN(endNum) && partialEnd && partialEnd.length > 1)) {
                throw new BadRequestError('Invalid range header');
            }

            // Calculate start and end positions
            const start = parseInt(partialStart ?? "0", 10);
            const end = partialEnd ? parseInt(partialEnd, 10) : stat.size - 1;

            // Validate range bounds
            if (start >= stat.size || end >= stat.size || start > end) {
                res.status(416).json({
                    error: 'Range not satisfiable',
                    details: `Requested range ${start}-${end}, file size: ${stat.size}`
                });
                return;
            }

            const contentLength = (end - start) + 1;

            // Set partial content headers
            res.status(206).header({
                'Content-Type': 'audio/mpeg',
                'Content-Length': contentLength.toString(),
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=3600',
                'ETag': `"${stat.mtime.getTime()}-${stat.size}"`
            });

            // Create read stream for specified range
            readStream = (await import('fs')).createReadStream(trackFilePath, {
                start: start,
                end: end
            });
        } else {
            // Handle full file request
            res.status(200).header({
                'Content-Type': 'audio/mpeg',
                'Content-Length': stat.size.toString(),
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=3600',
                'ETag': `"${stat.mtime.getTime()}-${stat.size}"`
            });

            // Create read stream for entire file
            readStream = (await import('fs')).createReadStream(trackFilePath);
        }

        // Handle stream errors
        readStream.on('error', (err) => {
            console.error('Stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            }
        });

        // Handle client disconnect
        req.on('close', () => {
            readStream.destroy();
        });

        // Pipe the stream to response
        readStream.pipe(res);

    } catch (error) {
        if (error instanceof NotFoundError) {
            res.status(error.status!).json({ error: error.message });
            return;
        }
        if (error instanceof ForbiddenError) {
            res.status(error.status!).json({ error: error.message });
            return;
        }
        if (error instanceof BadRequestError) {
            res.status(error.status!).json({ error: error.message });
            return;
        }
        if (error instanceof InternalServerError) {
            res.status(error.status!).json({ error: error.message });
            return;
        }
        
        console.error('Error in stream_one:', error);
        if (!res.headersSent) {
            const internalError = new InternalServerError('Internal server error');
            res.status(internalError.status!).json({ error: internalError.message });
        }
    }
}
