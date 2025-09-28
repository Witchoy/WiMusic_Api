import type { Request, Response, NextFunction } from "express";
import { object, optional, refine, string, number, boolean } from "superstruct";
import validator from "validator";

const { isInt } = validator;

export const transformFormData = (req: Request, res: Response, next: NextFunction) => {
    if (req.body.artist_id) req.body.artist_id = parseInt(req.body.artist_id);
    if (req.body.album_id) req.body.album_id = parseInt(req.body.album_id);
    if (req.body.hasAlbum) req.body.hasAlbum = req.body.hasAlbum === 'true';
    next();
};

export const TrackParams = object({
    track_id: refine(string(), 'int', (value) => isInt(value))
});

export const TrackCreateBody = object({
    title: string(),
    artist_id: refine(number(), 'positive', (value) => value > 0),
    hasAlbum: optional(boolean()),
    album_id: optional(refine(number(), 'positive', (value) => value > 0))
});

export const TrackConnectBody = object({
    album_id: refine(number(), 'positive', (value) => value > 0)
});

export const TrackQuery = object({
    skip: optional(number()),
    take: optional(number())
});