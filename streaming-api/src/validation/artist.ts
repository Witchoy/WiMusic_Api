import { number, object, optional } from "superstruct";

export const ArtistQuery = object({
    skip: optional(number()),
    take: optional(number())
})