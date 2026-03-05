const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 'Missing or invalid authorization header', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return next(new AppError('UNAUTHORIZED', 'Admin access required', 401));
    }
    req.admin = decoded;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    return next(new AppError('UNAUTHORIZED', 'Invalid or expired token', 401));
  }
};

module.exports = adminAuth;
