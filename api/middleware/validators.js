const { body, param, query } = require('express-validator');

/**
 * Validation chains for admin endpoints.
 * These whitelist allowed fields and enforce constraints.
 */

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const createCouponValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('image_url').trim().notEmpty().withMessage('Image URL is required'),
  body('cost_price')
    .isFloat({ min: 0 })
    .withMessage('cost_price must be a number >= 0'),
  body('margin_percentage')
    .isFloat({ min: 0 })
    .withMessage('margin_percentage must be a number >= 0'),
  body('value_type')
    .isIn(['STRING', 'IMAGE'])
    .withMessage('value_type must be STRING or IMAGE'),
  body('value').trim().notEmpty().withMessage('Coupon value is required'),
  // Reject pricing fields that must be server-computed
  body('minimum_sell_price').not().exists()
    .withMessage('minimum_sell_price cannot be set manually'),
  body('is_sold').not().exists()
    .withMessage('is_sold cannot be set manually')
];

const updateCouponValidation = [
  param('id').notEmpty().withMessage('Product ID is required'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('image_url').optional().trim().notEmpty().withMessage('Image URL cannot be empty'),
  body('cost_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('cost_price must be a number >= 0'),
  body('margin_percentage')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('margin_percentage must be a number >= 0'),
  body('value_type')
    .optional()
    .isIn(['STRING', 'IMAGE'])
    .withMessage('value_type must be STRING or IMAGE'),
  body('value').optional().trim().notEmpty().withMessage('Coupon value cannot be empty'),
  // Reject server-computed fields
  body('minimum_sell_price').not().exists()
    .withMessage('minimum_sell_price cannot be set manually'),
  body('is_sold').not().exists()
    .withMessage('is_sold cannot be set manually')
];

const createResellerValidation = [
  body('name').trim().notEmpty().withMessage('Reseller name is required')
];

module.exports = {
  loginValidation,
  createCouponValidation,
  updateCouponValidation,
  createResellerValidation
};
