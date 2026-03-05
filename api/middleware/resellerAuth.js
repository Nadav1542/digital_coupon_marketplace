const crypto = require('crypto');
const Reseller = require('../models/Reseller');
const { AppError } = require('./errorHandler');

const resellerAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 'Missing or invalid authorization header', 401));
  }

  const token = authHeader.split(' ')[1];
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const reseller = await Reseller.findOne({ token_hash: tokenHash, is_active: true });
    if (!reseller) {
      return next(new AppError('UNAUTHORIZED', 'Invalid or revoked token', 401));
    }
    req.reseller = reseller;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(err);
  }
};

module.exports = resellerAuth;
