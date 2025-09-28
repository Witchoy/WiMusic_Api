import { object, optional, refine, string, number } from "superstruct";
import validator from "validator";

const { isInt } = validator;

export const ArtistParams = object({
    artist_id: refine(string(), 'int', (value) => isInt(value))
});

export const ArtistCreateBody = object({
    name: string()
});

export const ArtistQuery = object({
    skip: optional(number()),
    take: optional(number())
});