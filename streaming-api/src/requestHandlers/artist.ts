import type { Request, Response } from "express";
import { NotFoundError, BadRequestError, ConflictError, InternalServerError } from "../utils/error.js";
import { prisma } from "../utils/db.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";
import { StructError } from "superstruct";

// Get all artists with optional pagination
export async function get_all(req: Request, res: Response) {
    try {
        const filter: Prisma.ArtistWhereInput = {};
        const { name, skip, take } = req.query;

        // Filter by name if specified in the query
        if (name) {
            filter.name = { contains: String(name) };
        }

        // Fetch artists from DB
        const artists = await prisma.artist.findMany({
            // skip: skip ? Number(skip) : undefined,
            // take: skip ? Number(skip) : undefined,
            where: filter,
            orderBy: { name: "asc" }
        });

        // Get total artist count for pagination
        const artistCount = await prisma.artist.count({
            where: filter
        });
        res.set('X-Total-Count', artistCount.toString());

        res.status(200).json({ artists });
    } catch (err: unknown) {
        if (err instanceof StructError) {
            const badRequestError = new BadRequestError('Invalid query parameters');
            return res.status(badRequestError.status!).json({ error: badRequestError.message });
        }
        
        const internalError = new InternalServerError('Failed to fetch artists');
        console.error('Error fetching artists:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Get a single artist by ID
export async function get_one(req: Request, res: Response) {
    try {
        const artist = await prisma.artist.findUnique({
            where: { id: Number(req.params.artist_id) },
            include: {
                albums: { include: { album: { select: { id: true, title: true } } } }
            }
        });
        if (!artist) {
            throw new NotFoundError('Artist not found');
        }
        // Format artist to include album titles
        const formattedArtist = {
            id: artist.id,
            name: artist.name,
            albums: artist.albums.map(a => a.album),
        };

        res.status(200).json({ artist: formattedArtist });
    } catch (err: unknown) {
        if (err instanceof NotFoundError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof StructError) {
            const badRequestError = new BadRequestError('Invalid query parameters');
            return res.status(badRequestError.status!).json({ error: badRequestError.message });
        }
        
        const internalError = new InternalServerError('Failed to fetch artist');
        console.error('Error fetching artist:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Get all tracks for a specific artist with optional pagination
export async function get_tracks(req: Request, res: Response) {
    try {
        const { skip, take } = req.query;

        const tracks = await prisma.track.findMany({
            // skip: skip ? Number(skip) : undefined,
            // take: skip ? Number(skip) : undefined,
            where: { artists: { some: { artistId: Number(req.params.artist_id) } } },
            orderBy: { title: 'asc' },
            select: { id: true, title: true }
        });

        // Get total track count for pagination
        const trackCount = await prisma.track.count({
            where: { artists: { some: { artistId: Number(req.params.artist_id) } } }
        });
        res.set('X-Total-Count', trackCount.toString());

        res.status(200).json({ tracks });
    } catch (err: unknown) {
        if (err instanceof StructError) {
            const badRequestError = new BadRequestError('Invalid query parameters');
            return res.status(badRequestError.status!).json({ error: badRequestError.message });
        }
        
        const internalError = new InternalServerError('Failed to fetch artist tracks');
        console.error('Error fetching artist tracks:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Get all albums for a specific artist with optional pagination
export async function get_albums(req: Request, res: Response) {
    try {
        const {skip, take} = req.query;
        // Fetch albums linked to artist
        const albums = await prisma.album.findMany({
            // skip: skip ? Number(skip) : undefined,
            // take: skip ? Number(skip) : undefined,
            where: { artists: { some: { artistId: Number(req.params.artist_id) } } },
            orderBy: { title: 'asc' }
        });

        // Get total album count for pagination
        const albumCount = await prisma.album.count({
            where: { artists: { some: { artistId: Number(req.params.artist_id) } } }
        });
        res.set('X-Total-Count', albumCount.toString());

        if (!albums || albums.length === 0) {
            throw new NotFoundError('No albums found for this artist');
        } else {
            res.json({ albums });
        }
    } catch (err: unknown) {
        if (err instanceof NotFoundError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof StructError) {
            const badRequestError = new BadRequestError('Invalid query parameters');
            return res.status(badRequestError.status!).json({ error: badRequestError.message });
        }
        
        const internalError = new InternalServerError('Failed to fetch artist albums');
        console.error('Error fetching artist albums:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Create a single artist
export async function create_one(req: Request, res: Response) {
    try {
        // Prepare artist data with optional fields
        const artistData: {
            name: string;
            biography?: string;
            country?: string;
        } = {
            name: req.body.name
        };

        // Add optional fields if provided
        if (req.body.biography) {
            artistData.biography = req.body.biography;
        }

        if (req.body.country) {
            artistData.country = req.body.country;
        }

        // Create the artist
        const newArtist = await prisma.artist.create({
            data: artistData
        });

        res.status(201).json({ artist: newArtist });
    } catch (err: unknown) {
        if (err instanceof StructError) {
            const badRequestError = new BadRequestError('Invalid request body');
            return res.status(badRequestError.status!).json({ error: badRequestError.message });
        }
        // Handle unique constraint violation (duplicate artist name)
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
            const conflictError = new ConflictError("Artist with this name already exists");
            return res.status(conflictError.status!).json({ error: conflictError.message });
        }

        const internalError = new InternalServerError('Failed to create artist');
        console.error('Error creating artist:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Delete a single artist
export async function delete_one(req: Request, res: Response) {
    try {
        const artistId = Number(req.params.artist_id);
        
        if (isNaN(artistId) || artistId <= 0) {
            throw new BadRequestError("Invalid artist_id");
        }

        // Check if artist has any tracks or albums
        const artist = await prisma.artist.findUnique({
            where: { id: artistId },
            include: {
                _count: {
                    select: {
                        tracks: true,
                        albums: true
                    }
                }
            }
        });

        if (!artist) {
            throw new NotFoundError('Artist not found');
        }

        if (artist._count.tracks > 0 || artist._count.albums > 0) {
            throw new ConflictError(`Cannot delete artist with existing tracks or albums. Found ${artist._count.tracks} tracks and ${artist._count.albums} albums.`);
        }

        await prisma.artist.delete({
            where: { id: artistId }
        });
        
        res.status(204).send();
    } catch (err: unknown) {
        if (err instanceof NotFoundError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof BadRequestError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof ConflictError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
            const notFoundError = new NotFoundError('Artist not found');
            return res.status(notFoundError.status!).json({ error: notFoundError.message });
        }
        
        const internalError = new InternalServerError('Failed to delete artist');
        console.error('Error deleting artist:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}