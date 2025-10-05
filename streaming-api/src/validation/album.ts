import { object, optional, string, number, refine } from "superstruct";
import validator from "validator";

const { isInt } = validator;

export const AlbumParams = object({
    album_id: refine(string(), 'int', (value) => isInt(value))
});

export const AlbumCreationData = object({
    title: string(),
    artist_id: number(),
    releaseDate: optional(number()),
    trackNumber: optional(number())
});

export const AlbumGetAllQuery = object({
    skip: optional(number()),
    take: optional(number()),
    title: optional(string())
});