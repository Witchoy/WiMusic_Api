import { object, optional, refine, string } from "superstruct";
import validator from "validator";

const { isInt } = validator;

export const ArtistParams = object({
    artist_id: refine(string(), 'int', (value) => isInt(value)),
    album_id: optional(refine(string(), 'int', (value) => isInt(value))),
    track_id: optional(refine(string(), 'int', (value) => isInt(value)))
});

export const ArtistCreationData = object({
    name: string(),
    biography: optional(string()),
    country: optional(string())
});

export const ArtistGetAllQuery = object({
    skip: optional(refine(string(), 'int', (value) => isInt(value))),
    take: optional(refine(string(), 'int', (value) => isInt(value))),
    name: optional(string())
});

export const ArtistGetOneQuery = object({
    name: optional(string())
});

export const ArtistGetTrackQuery = object({
    skip: optional(refine(string(), 'int', (value) => isInt(value))),
    take: optional(refine(string(), 'int', (value) => isInt(value)))
});

export const ArtistGetAlbumQuery = object({
    skip: optional(refine(string(), 'int', (value) => isInt(value))),
    take: optional(refine(string(), 'int', (value) => isInt(value)))
});

