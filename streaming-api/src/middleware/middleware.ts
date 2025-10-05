import type { Request, Response, NextFunction } from "express";
import { assert, Struct } from "superstruct";
import { BadRequestError } from "../utils/error.js";

export function createValidateParams<T>(schema: Struct<T, any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            assert(req.params, schema);
            next();
        } catch (error) {
            const badRequestError = new BadRequestError('Invalid parameters');
            res.status(badRequestError.status!).json({ error: badRequestError.message });
        }
    };
};

export function createValidateBody<T>(schema: Struct<T, any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            assert(req.body, schema);
            next();
        } catch (error) {
            const badRequestError = new BadRequestError('Invalid request body');
            res.status(badRequestError.status!).json({ error: badRequestError.message });
        }
    };
};

export function createValidateQuery<T>(schema: Struct<T, any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            assert(req.query, schema);
            next();
        } catch (error) {
            const badRequestError = new BadRequestError('Invalid query parameters');
            res.status(badRequestError.status!).json({ error: badRequestError.message });
        }
    };
}