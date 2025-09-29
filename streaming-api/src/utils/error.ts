export class HttpError extends Error {
    status?: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export class NotFoundError extends HttpError {
    constructor(message: string) {
        super(message, 404);
    }
}

export class ValidationError extends HttpError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class DatabaseError extends HttpError {
    constructor(message: string) {
        super(message, 500);
    }
}

export class BadRequestError extends HttpError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class ConflictError extends HttpError {
    constructor(message: string) {
        super(message, 409);
    }
}

export class ForbiddenError extends HttpError {
    constructor(message: string) {
        super(message, 403);
    }
}

export class InternalServerError extends HttpError {
    constructor(message: string) {
        super(message, 500);
    }
}

