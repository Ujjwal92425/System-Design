export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details: any = null
  ) {
    super(message);
    Object.setPrototypeOf(this, new Target().constructor);
  }
}

const Target = AppError;
