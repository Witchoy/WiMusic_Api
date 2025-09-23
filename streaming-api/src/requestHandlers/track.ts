import type { Request, Response } from "express";
import { NotFoundError } from "../error.js";
import { prisma } from "../db.js";

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
    const track = await prisma.track.findUnique({
        where: { id: Number(req.params.track_id) }, // Find track by ID
    });
    if (!track) {
        throw new NotFoundError('Track_id not found'); // Throw error if not found
    } else {
        res.json({ track }); // Return track as JSON
    }
}