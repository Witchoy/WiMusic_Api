import { object, optional, string, number, array, refine } from "superstruct";
import validator from "validator";

const { isInt } = validator;

export const PlaylistParams = object({
    playlist_id: refine(string(), 'int', (value) => isInt(value))
});

export const PlaylistCreationData = object({
    name: string(),
    trackIds: optional(array(number()))
});

export const PlaylistGetAllQuery = object({
    skip: optional(refine(string(), 'int', (value) => isInt(value))),
    take: optional(refine(string(), 'int', (value) => isInt(value))),
    name: optional(string())
});