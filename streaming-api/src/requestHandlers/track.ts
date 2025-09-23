import type { Request, Response } from "express";
import { NotFoundError } from "../utils/error.js";
import { prisma } from "../utils/db.js";
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../utils/config.js';

// Define your media root directory - adjust this path to your actual media directory
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
    const skip = req.query.skip ? Number(req.query.skip) : undefined; // Number of records to skip
    const take = req.query.take ? Number(req.query.take) : undefined; // Number of records to take

    const tracks = await prisma.track.findMany({
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        orderBy: { title: 'asc' } // Sort tracks by title
    });

    const trackCount = await prisma.track.count(); // Total number of tracks
    res.set('X-Total-Count', trackCount.toString()); // Set total count in response header

    res.json({ tracks }); // Return tracks as JSON
}

// Get a single track by ID
export async function get_one(req: Request, res: Response) {
    const trackId = Number(req.params.track_id);
    
    const track = await prisma.track.findUnique({
        where: { id: trackId },
        include: {
            artists: {
                include: {
                    artist: true
                }
            },
            albums: {
                include: {
                    album: true
                }
            }
        }
    });

    if (!track) {
        throw new NotFoundError('Track not found');
    }

    res.json({ track });
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