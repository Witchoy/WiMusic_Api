import type { Request, Response, NextFunction } from "express";
import { assert } from "superstruct";

export const createValidateParams = (schema: any) => {
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

export const createValidateBody = (schema: any) => {
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

export const createValidateQuery = (schema: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            assert(req.query, schema);
            next();
        } catch (error) {
            res.status(400).json({
                error: 'Invalid query parameters',
                details: error instanceof Error ? error.message : 'Validation failed'
            });
        }
    };
};