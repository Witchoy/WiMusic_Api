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

