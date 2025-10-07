import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../utils/db.js";
import { StructError } from "superstruct";
import { BadRequestError, ConflictError, InternalServerError, NotFoundError } from "../utils/error.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// Get all genre
export async function get_all(req: Request, res: Response) {
    try {
        const filter: Prisma.GenreWhereInput = {};
        const { name, skip, take } = req.query;

        // Filter by name if provided
        if (name) {
            filter.name = { contains: String(name) };
        }

        // Fetch genres from database
        const genres = await prisma.genre.findMany({
            // skip: skip ? Number(skip) : undefined,
            // take: take ? Number(take) : undefined,
            where: filter,
            orderBy: { name: 'asc' }
        });

        // Get total count for pagination headers
        const genreCount = await prisma.genre.count({
            where: filter
        });
        res.set('X-Total-Count', genreCount.toString());

        res.status(200).json({ genres });
    } catch (err: unknown) {
        // Handle validation errors from query parameters
        if (err instanceof StructError) {
            const badRequestError = new BadRequestError('Invalid query parameters');
            return res.status(badRequestError.status!).json({ error: badRequestError.message });
        }

        // Handle unexpected server errors
        const internalError = new InternalServerError('Failed to fetch genres');
        console.error('Error fetching genres:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Get a single genre by ID
export async function get_one(req: Request, res: Response) {
    try {
        const genre = await prisma.genre.findUnique({
            where: { id: Number(req.params.genre_id) },
        });
        
        // Check if genre exists
        if (!genre) {
            throw new NotFoundError(`Genre ${req.params.genre_id} not found`);
        }

        res.status(200).json({ genre });
    } catch (err: unknown) {
        // Handle genre not found errors
        if (err instanceof NotFoundError) {
            return res.status(err.status!).json({ error: err.message });
        }

        // Handle unexpected server errors
        const internalError = new InternalServerError('Failed to fetch genre');
        console.error('Error fetching genre:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Create a single genre 
export async function create_one(req: Request, res: Response) {
    try {
        // Prepare genre data with required and optional fields
        const genreData: {
            name: string;
            parentId?: number;
        } = {
            name: req.body.name
        };

        // Add parent genre ID if provided (for sub-genres)
        if (req.body.parentId !== undefined) {
            genreData.parentId = Number(req.body.parentId);
        }

        // Create new genre in database
        const newGenre = await prisma.genre.create({
            data: genreData
        });

        res.status(201).json({ genre: newGenre });
    } catch (err: unknown) {
        // Handle validation errors from request body
        if (err instanceof BadRequestError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof StructError) {
            const badRequestError = new BadRequestError('Invalid request body');
            return res.status(badRequestError.status!).json({ error: badRequestError.message });
        }
        // Handle unique constraint violation (duplicate genre name)
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
            const conflictError = new ConflictError('Genre with this name already exists');
            return res.status(conflictError.status!).json({ error: conflictError.message });
        }
        // Handle foreign key constraint (parent genre not found)
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2003') {
            const notFoundError = new NotFoundError('Parent genre not found');
            return res.status(notFoundError.status!).json({ error: notFoundError.message });
        }

        // Handle unexpected server errors
        const internalError = new InternalServerError('Failed to create genre');
        console.error('Error creating genre:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Delete a single genre
export async function delete_one(req: Request, res: Response) {
    try {
        const genreId = Number(req.params.genre_id);
        
        if (isNaN(genreId) || genreId <= 0) {
            throw new BadRequestError("Invalid genre_id");
        }

        // Before deletion, check if genre has children
        const hasChildren = await prisma.genre.findFirst({
            where: { parentId: genreId }
        });

        if (hasChildren) {
            throw new ConflictError("Cannot delete genre with child genres");
        }

        // Delete genre from database (cascade will handle related records)
        await prisma.genre.delete({
            where: { id: genreId }
        });

        res.status(204).send();
    } catch (err: unknown) {
        // Handle invalid genre ID errors
        if (err instanceof BadRequestError) {
            return res.status(err.status!).json({ error: err.message });
        }
        // Handle genre not found during deletion
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
            const notFoundError = new NotFoundError('Genre not found');
            return res.status(notFoundError.status!).json({ error: notFoundError.message });
        }
        
        // Handle unexpected server errors
        const internalError = new InternalServerError('Failed to delete genre');
        console.error('Error deleting genre:', err);
        res.status(internalError.status!).json({ error: internalError.message });
    }
}