import type { Request, Response } from "express";
import { NotFoundError } from "../error.js";
import { prisma } from "../db.js";

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
    });
    if (!album) {
        // Throw error if album not found
        throw new NotFoundError('Album_id not found');
    } else {
        // Respond with album
        res.json({ album });
    }
}