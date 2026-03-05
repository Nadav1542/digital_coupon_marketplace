const { validationResult } = require('express-validator');

/**
 * Middleware that checks express-validator results.
 * Returns standardized error format if validation fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg).join(', ');
    return res.status(422).json({
      error_code: 'VALIDATION_ERROR',
      message: messages
    });
  }
  next();
};

module.exports = validate;
