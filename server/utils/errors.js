export class AppError extends Error {
  constructor(message, status = 500, code = 'SERVER_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const handleDbError = (err) => {
  if (err.code === '23505') {
    // Unique constraint violation
    return new AppError('Duplicate entry', 400, 'DUPLICATE_ENTRY');
  }
  if (err.code === '23503') {
    // Foreign key violation
    return new AppError('Referenced record not found', 400, 'INVALID_REFERENCE');
  }
  return err;
};
