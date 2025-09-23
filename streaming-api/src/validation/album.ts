import { number, object, optional } from "superstruct";

export const AlbumQuery = object({
    skip: optional(number()),
    take: optional(number())
})