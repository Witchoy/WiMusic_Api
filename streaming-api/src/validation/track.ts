import { object, optional, string, number, coerce, boolean, refine, union, array } from "superstruct";
import validator from "validator";

const { isInt } = validator;

export const TrackParams = object({
    track_id: refine(string(), 'int', (value) => isInt(value))
});

// For multipart/form-data (strings from multer)
export const TrackCreationData = object({
    title: string(),
    artist_id: refine(string(), 'int', (value) => isInt(value)),
    duration: optional(refine(string(), 'int', (value) => isInt(value))),
    hasAlbum: optional(refine(string(), 'boolean', (val) => val === 'true' || val === 'false')),
    album_id: optional(refine(string(), 'int', (value) => isInt(value))),
    genre_id: optional(union([
        refine(string(), 'int', (value) => isInt(value)),
        array(refine(string(), 'int', (value) => isInt(value)))
    ]))
});

export const TrackUpdateData = object({
    album_id: refine(string(), 'int', (value) => isInt(value))
});

export const TrackGetAllQuery = object({
    skip: optional(refine(string(), 'int', (value) => isInt(value))),
    take: optional(refine(string(), 'int', (value) => isInt(value))),
    title: optional(string())
});