import { number, object, optional } from "superstruct";

export const TrackQuery = object({
    skip: optional(number()),
    take: optional(number())
})