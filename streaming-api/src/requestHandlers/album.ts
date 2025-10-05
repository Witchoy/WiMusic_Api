import type { Request, Response } from "express";
import { NotFoundError, BadRequestError, InternalServerError } from "../utils/error.js";
import { prisma } from "../utils/db.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { StructError } from "superstruct";
import type { Prisma } from "@prisma/client";

// Handler to get all albums, with optional pagination
export async function get_all(req: Request, res: Response) {
    try {
        const filter: Prisma.AlbumWhereInput = {};
        const { title, page = '1', pageSize = '10' } = req.query;

        // Filter by title if specified in the query
        if(title) {
            filter.title = { contains: String(title) };
        }

        // Parse pagination parameters
        const pageNum = parseInt(page as string) || 1;
        const pageSizeNum = parseInt(pageSize as string) || 10;
        const skip = (pageNum - 1) * pageSizeNum;

        const [albums, totalCount] = await Promise.all([
            prisma.album.findMany({
                skip,
                take: pageSizeNum,
                where: filter,
                orderBy: { title: 'asc' }
            }),
            prisma.album.count({
                where: filter
            })
        ]);

        // Return structured pagination response
        res.status(200).json({
            data: albums,
            pagination: {
                page: pageNum,
                pageSize: pageSizeNum,
                totalCount,
                totalPages: Math.ceil(totalCount / pageSizeNum)
            }
        });
    } catch (err: unknown) {
        if (err instanceof StructError) {
            const badRequestError = new BadRequestError('Invalid query parameters');
            return res.status(badRequestError.status!).json({ error: badRequestError.message });
        }
        
        const internalError = new InternalServerError('Failed to fetch albums');
        return res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Handler to get a single album by ID
export async function get_one(req: Request, res: Response) {
    try {
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
            artists: album.artists.map(a => a.artist),
            tracks: album.tracks.map(t => t.track)
        };

        res.status(200).json(formattedAlbum);
    } catch (err: unknown) {
        if (err instanceof NotFoundError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof StructError) {
            const badRequestError = new BadRequestError('Invalid query parameters');
            return res.status(badRequestError.status!).json({ error: badRequestError.message });
        }
        
        const internalError = new InternalServerError('Failed to fetch album');
        return res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Create a single album
export async function create_one(req: Request, res: Response) {
    try {
        const artistId = Number(req.body.artist_id);
        
        if (isNaN(artistId) || artistId <= 0) {
            throw new BadRequestError("Invalid artist_id");
        }

        // Use transaction to ensure atomicity
        const newAlbum = await prisma.$transaction(async (tx) => {
            // Prepare album data with optional fields
            const albumData: {
                title: string;
                releaseDate?: number;
                trackNumber?: number;
            } = {
                title: req.body.title
            };

            // Add optional fields if provided
            if (req.body.releaseDate !== undefined) {
                albumData.releaseDate = Number(req.body.releaseDate);
            }

            if (req.body.trackNumber !== undefined) {
                albumData.trackNumber = Number(req.body.trackNumber);
            }

            // Create the album
            const album = await tx.album.create({
                data: albumData
            });

            // Create the artist-album relationship
            await tx.artistAlbum.create({
                data: {
                    albumId: album.id,
                    artistId: artistId
                }
            });

            // Return album with artist relationship
            return await tx.album.findUniqueOrThrow({
                where: { id: album.id },
                include: {
                    artists: {
                        include: {
                            artist: true
                        }
                    }
                }
            });
        });

        res.status(201).json(newAlbum);
    } catch (err: unknown) {
        if (err instanceof BadRequestError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof StructError) {
            const badRequestError = new BadRequestError('Invalid request body');
            return res.status(badRequestError.status!).json({ error: badRequestError.message });
        }
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2003') {
            const notFoundError = new NotFoundError('Album not found');
            return res.status(notFoundError.status!).json({ error: notFoundError.message });
        }

        const internalError = new InternalServerError('Failed to create album');
        return res.status(internalError.status!).json({ error: internalError.message });
    }
}

// Delete a single album
export async function delete_one(req: Request, res: Response) {
    try {
        const albumId = Number(req.params.album_id);
        
        if (isNaN(albumId) || albumId <= 0) {
            throw new BadRequestError("Invalid album_id");
        }

        // Simply delete - cascade will handle TrackAlbum, ArtistAlbum, AlbumGenre
        await prisma.album.delete({
            where: { id: albumId }
        });
        
        res.status(204).json({ message: 'Album deleted successfully' });
    } catch (err: unknown) {
        if (err instanceof BadRequestError) {
            return res.status(err.status!).json({ error: err.message });
        }
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
            const notFoundError = new NotFoundError('Album not found');
            return res.status(notFoundError.status!).json({ error: notFoundError.message });
        }
        
        const internalError = new InternalServerError('Failed to delete album');
        return res.status(internalError.status!).json({ error: internalError.message });
    }
}