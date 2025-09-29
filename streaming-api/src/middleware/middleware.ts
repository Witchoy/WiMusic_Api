import type { Request, Response, NextFunction } from "express";
import { assert, Struct } from "superstruct";

export function createValidateParams<T>(schema: Struct<T, any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            assert(req.params, schema);
            next();
        } catch (error) {
            res.status(400).json({
                error: 'Invalid parameters',
                details: error instanceof Error ? error.message : 'Validation failed'
            });
        }
    };
};

export function createValidateBody<T>(schema: Struct<T, any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            assert(req.body, schema);
            next();
        } catch (error) {
            res.status(400).json({
                error: 'Invalid request body',
                details: error instanceof Error ? error.message : 'Validation failed'
            });
        }
    };
};

// Make the function more generic to accept specific struct types
export function createValidateQuery<T>(schema: Struct<T, any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            assert(req.query, schema);
            next();
        } catch (error) {
            res.status(400).json({ error: 'Invalid query parameters' });
        }
    };
}