import { object, optional, refine, string, number } from "superstruct";
import validator from "validator";

const { isInt } = validator;

export const AlbumParams = object({
    album_id: refine(string(), 'int', (value) => isInt(value))
});

export const AlbumCreateBody = object({
    title: string()
});

export const AlbumQuery = object({
    skip: optional(number()),
    take: optional(number())
});