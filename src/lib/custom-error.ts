export class CustomError extends Error {
  info: Record<string, unknown>;
  status: number;
  code?: string;

  constructor(message: string, status: number, info: Record<string, unknown> = {}) {
    super(message);
    this.name = 'CustomError';
    this.status = status;
    this.info = info;
    this.code = info.code as string | undefined;
  }
}