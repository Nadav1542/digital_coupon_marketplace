/**
 * Standardized error response format:
 * { error_code: "ERROR_NAME", message: "Human readable message" }
 */

class AppError extends Error {
  constructor(errorCode, message, statusCode) {
    super(message);
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error_code: err.errorCode,
      message: err.message
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message).join(', ');
    return res.status(422).json({
      error_code: 'VALIDATION_ERROR',
      message: messages
    });
  }

  // Mongoose cast error (invalid ObjectId / UUID)
  if (err.name === 'CastError') {
    return res.status(422).json({
      error_code: 'INVALID_ID',
      message: 'Invalid ID format'
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    error_code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred'
  });
};

module.exports = { AppError, errorHandler };
