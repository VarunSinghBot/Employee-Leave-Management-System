export interface FieldError {
  field: string;
  message: string;
}

// Throw this anywhere in a controller; the error middleware turns it into a friendly JSON response
export class ApiError extends Error {
  statusCode: number;
  errors: FieldError[];

  constructor(statusCode: number, message: string, errors: FieldError[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }

  static badRequest(message: string, errors?: FieldError[]) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = "Please sign in to continue") {
    return new ApiError(401, message);
  }
  static forbidden(message = "You do not have permission to do this") {
    return new ApiError(403, message);
  }
  static notFound(message = "The requested resource was not found") {
    return new ApiError(404, message);
  }
  static conflict(message: string) {
    return new ApiError(409, message);
  }
}
