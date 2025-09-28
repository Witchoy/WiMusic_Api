import type { Request, Response } from "express";
import { NotFoundError } from "../utils/error.js";
import { prisma } from "../utils/db.js";
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../utils/config.js';
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const MEDIA_ROOT = path.resolve(config.mediaRoot);

/**
 * Validate that file path is within allowed media directory
 */
const validateFilePath = (filePath: string): boolean => {
    const resolvedPath = path.resolve(filePath);
    return resolvedPath.startsWith(MEDIA_ROOT);
};

// Get all tracks with optional pagination (skip/take)
export async function get_all(req: Request, res: Response) {
    const skip = req.query.skip ? Number(req.query.skip) : undefined;
    const take = req.query.take ? Number(req.query.take) : undefined;

    const tracks = await prisma.track.findMany({
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        orderBy: { title: 'asc' },
        include: {
            artists: {
                include: {
                    artist: {
                        select: { id: true, name: true }
                    }
                }
            },
            albums: {
                include: {
                    album: {
                        select: { id: true, title: true }
                    }
                }
            }
        }
    });

    const trackCount = await prisma.track.count();
    res.set('X-Total-Count', trackCount.toString());

    // Format tracks to include artist names and album titles
    const formattedTracks = tracks.map(track => ({
        ...track,
        artists: track.artists.map(a => a.artist),
        albums: track.albums.map(a => a.album)
    }));

    res.json({ tracks: formattedTracks });
}

// Get a single track by ID
export async function get_one(req: Request, res: Response) {
    const trackId = Number(req.params.track_id);

    const track = await prisma.track.findUnique({
        where: { id: trackId },
        include: {
            artists: {
                include: {
                    artist: {
                        select: { id: true, name: true }
                    }
                }
            },
            albums: {
                include: {
                    album: {
                        select: { id: true, title: true }
                    }
                }
            }
        }
    });

    if (!track) {
        throw new NotFoundError('Track not found');
    }

    // Format track to include artist names and album titles
    const formattedTrack = {
        ...track,
        artists: track.artists.map(a => a.artist),
        albums: track.albums.map(a => a.album)
    };

    res.json({ tracks: formattedTrack });
}

// Create a single track and connect it to the artist and album
export async function create_one(req: Request, res: Response) {
    try {
        // Generate a unique filename for the track
        const uniqueId = crypto.randomUUID();
        const filePath = `./media/${uniqueId}.mp3`;

        // First create the track
        const newTrack = await prisma.track.create({
            data: {
                title: req.body.title,
                filePath: filePath
            }
        });

        // Then create the artist-track relationship
        await prisma.artistTrack.create({
            data: {
                trackId: newTrack.id,
                artistId: req.body.artist_id
            }
        });

        // Then create the track-album relationship
        if (req.body.hasAlbum === true) {
            await prisma.trackAlbum.create({
                data: {
                    trackId: newTrack.id,
                    albumId: req.body.album_id
                }
            })
        }

        res.status(201).json({ newTrack });
    } catch (err: unknown) {
        throw err;
    }
}

// Connect a single track to an album
export async function connect_one(req: Request, res: Response) {
    try {
        const trackId = Number(req.params.track_id);
        const albumId = req.body.album_id;

        // Check if relationship already exists
        const existingRelation = await prisma.trackAlbum.findUnique({
            where: {
                trackId_albumId: {
                    trackId: trackId,
                    albumId: albumId
                }
            }
        });

        if (existingRelation) {
            return res.status(409).json({ error: "Track is already connected to this album" });
        }

        // Create the relationship (foreign key constraints will handle existence validation)
        await prisma.trackAlbum.create({
            data: {
                trackId: trackId,
                albumId: albumId
            }
        });

        res.status(201).json({
            message: "Track added to album successfully",
            trackId: trackId,
            albumId: albumId
        });

    } catch (err: unknown) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2003') {
            throw new NotFoundError('Track or Album not found');
        }
        throw err;
    }
}

// Delete a single track
export async function delete_one(req: Request, res: Response) {
    try {
        await prisma.track.delete({
            where: { id: Number(req.params.track_id) }
        })
        res.status(204).send();
    } catch (err: unknown) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
            throw new NotFoundError('Track not found');
        }
        throw err;
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
            res.status(404).json({ error: 'Track not found' });
            return;
        }

        const trackFilePath = track.filePath.toString();

        // Check if file path exists in track record
        if (!trackFilePath) {
            res.status(500).json({ error: 'Track file path not found' });
            return;
        }

        // Security check: validate file path is within allowed directory
        if (!validateFilePath(trackFilePath)) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Check if file exists on filesystem
        try {
            await fs.access(trackFilePath);
        } catch {
            res.status(404).json({ error: 'Audio file not found on server' });
            return;
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
                res.status(400).json({ error: 'Invalid range header' });
                return;
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
        console.error('Error in stream_one:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
            });
        }
    }
}