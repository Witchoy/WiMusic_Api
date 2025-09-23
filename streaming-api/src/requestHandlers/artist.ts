import type { Request, Response } from "express";
import { NotFoundError } from "../utils/error.js";
import { prisma } from "../utils/db.js";

// Get all artists with optional pagination
export async function get_all(req: Request, res: Response) {
    const skip = req.query.skip ? Number(req.query.skip) : undefined;
    const take = req.query.take ? Number(req.query.take) : undefined;

    // Fetch artists from DB
    const artists = await prisma.artist.findMany({
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        orderBy: { name: "asc" }
    });

    // Get total artist count for pagination
    const artistCount = await prisma.artist.count();
    res.set('X-Total-Count', artistCount.toString());

    res.json({ artists });
}

// Get a single artist by ID
export async function get_one(req: Request, res: Response) {
    const artist = await prisma.artist.findUnique({
        where: { id: Number(req.params.artist_id) },
    });
    if (!artist) {
        throw new NotFoundError('Artist_id not found');
    } else {
        res.json({ artist });
    }
}

// Get all tracks for a specific artist with optional pagination
export async function get_tracks(req: Request, res: Response) {
    const skip = req.query.skip ? Number(req.query.skip) : undefined;
    const take = req.query.take ? Number(req.query.take) : undefined;

    // Fetch tracks linked to artist
    const tracks = await prisma.track.findMany({
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        where: { artists: { some: { artistId: Number(req.params.artist_id) } } },
        orderBy: { title: 'asc' }
    });

    // Get total track count for pagination
    const trackCount = await prisma.track.count();
    res.set('X-Total-Count', trackCount.toString());

    if (!tracks || tracks.length === 0) {
        throw new NotFoundError('No tracks found for this artist');
    } else {
        res.json({ tracks });
    }
}

// Get all albums for a specific artist with optional pagination
export async function get_albums(req: Request, res: Response) {
    const skip = req.query.skip ? Number(req.query.skip) : undefined;
    const take = req.query.take ? Number(req.query.take) : undefined;

    // Fetch albums linked to artist
    const albums = await prisma.album.findMany({
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        where: { artists: { some: { artistId: Number(req.params.artist_id) } } },
        orderBy: { title: 'asc' }
    });

    // Get total album count for pagination
    const albumCount = await prisma.album.count();
    res.set('X-Total-Count', albumCount.toString());

    if (!albums || albums.length === 0) {
        throw new NotFoundError('No albums found for this artist');
    } else {
        res.json({ albums });
    }
}