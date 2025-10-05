import { object, optional, string, number, refine } from "superstruct";
import validator from "validator";

const { isInt } = validator;

export const GenreParams = object({
    genre_id: refine(string(), 'int', (value) => isInt(value))
});

export const GenreCreationData = object({
    name: string(),
    parentId: optional(number()),
});

export const GenreGetAllQuery = object({
    skip: optional(number()),
    take: optional(number()),
    name: optional(string())
});