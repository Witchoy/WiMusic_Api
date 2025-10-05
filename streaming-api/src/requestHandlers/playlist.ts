import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../utils/db.js";
import { StructError } from "superstruct";
import { BadRequestError, InternalServerError, NotFoundError } from "../utils/error.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// Get all playlist
export async function get_all(req: Request, res: Response) {
    try {
        const filter: Prisma.PlaylistWhereInput = {};
        const { name, skip, take } = req.query;

        // Filter by name if provided
        if (name) {
            filter.name = { contains: String(name) };
        }

        // Fetch playlists from database
        const playlists = await prisma.playlist.findMany({
            // skip: skip ? Number(skip) : undefined,
            // take: take ? Number(take) : undefined,
            where: filter,
            orderBy: { name: 'asc' }
        });

        // Get total count for pagination headers
        const playlistCount = await prisma.playlist.count({
            where: filter
        });
        res.set('X-Total-Count', playlistCount.toString());

        res.status(200).json({ playlists });
    } catch (err: unknown) {
        // Handle validation errors from query parameters
        if (err instanceof StructError) {
            const badRequestError = new BadRequestError('Invalid query parameters');
            return res.status(badRequestError.status!).json({ error: badRequestError.message });
        }

        // Handle unexpected server errors
        const internalError = new InternalServerError('Failed to fetch playlists');
        console.error('Error fetching playlists:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Get a single playlist by ID
export async function get_one(req: Request, res: Response) {
    try {
        const playlist = await prisma.playlist.findUnique({
            where: { id: Number(req.params.playlist_id) },
        });
        
        // Check if playlist exists
        if (!playlist) {
            throw new NotFoundError(`Playlist ${req.params.playlist_id} not found`);
        }

        res.status(200).json({ playlist });
    } catch (err: unknown) {
        // Handle playlist not found errors
        if (err instanceof NotFoundError) {
            return res.status(err.status!).json({ error: err.message });
        }

        // Handle unexpected server errors
        const internalError = new InternalServerError(`Failed to fetch playlist ${req.params.playlist_id}`);
        console.error(`Error fetching playlist ${req.params.playlist_id} :`, err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Create a single playlist 
export async function create_one(req: Request, res: Response) {
    try {
        // Use transaction to ensure atomicity when adding tracks
        const newPlaylist = await prisma.$transaction(async (tx) => {
            // Create the playlist
            const playlist = await tx.playlist.create({
                data: {
                    name: req.body.name
                }
            });

            // Add tracks to playlist if provided
            if (req.body.trackIds && req.body.trackIds.length > 0) {
                // Validate that all tracks exist
                const tracks = await tx.track.findMany({
                    where: {
                        id: {
                            in: req.body.trackIds
                        }
                    },
                    select: { id: true }
                });

                // Check if all requested tracks were found
                const foundTrackIds = tracks.map(t => t.id);
                const missingTrackIds = req.body.trackIds.filter((id: number) => !foundTrackIds.includes(id));
                
                if (missingTrackIds.length > 0) {
                    throw new NotFoundError(`Tracks not found: ${missingTrackIds.join(', ')}`);
                }

                // Create playlist-track relationships with positions
                await tx.playlistTrack.createMany({
                    data: req.body.trackIds.map((trackId: number, index: number) => ({
                        playlistId: playlist.id,
                        trackId: trackId,
                        position: index + 1
                    }))
                });
            }

            // Return the complete playlist with tracks
            return await tx.playlist.findUniqueOrThrow({
                where: { id: playlist.id },
                include: {
                    tracks: {
                        include: {
                            track: {
                                select: {
                                    id: true,
                                    title: true,
                                    duration: true
                                }
                            }
                        },
                        orderBy: { position: 'asc' }
                    }
                }
            });
        });

        // Format response to show tracks without join table data
        const formattedPlaylist = {
            id: newPlaylist.id,
            name: newPlaylist.name,
            createdAt: newPlaylist.createdAt,
            updatedAt: newPlaylist.updatedAt,
            tracks: newPlaylist.tracks.map(pt => ({
                ...pt.track,
                position: pt.position
            }))
        };

        res.status(201).json({ playlist: formattedPlaylist });
    } catch (err: unknown) {
        // Handle validation errors from request body
        if (err instanceof BadRequestError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof NotFoundError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof StructError) {
            const badRequestError = new BadRequestError('Invalid request body');
            return res.status(badRequestError.status!).json({ error: badRequestError.message });
        }

        // Handle unexpected server errors
        const internalError = new InternalServerError('Failed to create playlist');
        console.error('Error creating playlist:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Delete a single playlist
export async function delete_one(req: Request, res: Response) {
    try {
        const playlistId = Number(req.params.playlist_id);
        
        if (isNaN(playlistId) || playlistId <= 0) {
            throw new BadRequestError("Invalid playlist_id");
        }

        await prisma.playlist.delete({
            where: { id: playlistId }
        });

        res.status(204).send();
    } catch (err: unknown) {
        // Handle invalid playlist ID errors
        if (err instanceof BadRequestError) {
            return res.status(err.status!).json({ error: err.message });
        }
        // Handle playlist not found during deletion
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
            const notFoundError = new NotFoundError('Playlist not found');
            return res.status(notFoundError.status!).json({ error: notFoundError.message });
        }
        
        // Handle unexpected server errors
        const internalError = new InternalServerError('Failed to delete playlist');
        console.error('Error deleting playlist:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}