import type { Request, Response } from "express";
import { NotFoundError } from "../utils/error.js";
import { prisma } from "../utils/db.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// Handler to get all albums, with optional pagination
export async function get_all(req: Request, res: Response) {
    const skip = req.query.skip ? Number(req.query.skip) : undefined; // Number of records to skip
    const take = req.query.take ? Number(req.query.take) : undefined; // Number of records to take

    // Fetch albums from database with optional skip/take and order by title
    const albums = await prisma.album.findMany({
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        orderBy: { title: 'asc' }
    });

    // Get total count of albums for pagination
    const albumCount = await prisma.album.count();
    res.set('X-Total-Count', albumCount.toString());

    // Respond with albums
    res.json({ albums });
}

// Handler to get a single album by ID
export async function get_one(req: Request, res: Response) {
    const album = await prisma.album.findUnique({
        where: { id: Number(req.params.album_id) },
        include: {
            artists: { include: { artist: { select: { id: true, name: true } } } },
            tracks: { include: { track: { select: { id: true, title: true } } } }
        }
    });

    if (!album) {
        throw new NotFoundError('Album_id not found');
    }

    // Reformat the response to strip join table fields
    const formattedAlbum = {
        id: album.id,
        title: album.title,
        artists: album.artists.map(a => a.artist), // only { id, name }
        tracks: album.tracks.map(t => t.track)     // only { id, title }
    };

    res.json({ album: formattedAlbum });
}

// Create a single album
export async function create_one(req: Request, res: Response) {
    try {
        // First create the album
        const newAlbum = await prisma.album.create({
            data: {
                title: req.body.title,
            }
        });

        // Then create the artist-album relationship
        await prisma.artistAlbum.create({
            data: {
                albumId: newAlbum.id,
                artistId: req.body.artist_id
            }
        });

        res.status(201).json({ newAlbum });
    } catch (err: unknown) {
        throw err;
    }
}

// Delete a single album
export async function delete_one(req: Request, res: Response) {
    try {
        await prisma.album.delete({
            where: { id: Number(req.params.album_id) }
        })
        res.status(204).send();
    } catch (err: unknown) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
            throw new NotFoundError('Album not found');
        }
        throw err;
    }
}