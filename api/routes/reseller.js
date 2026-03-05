const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const resellerAuth = require('../middleware/resellerAuth');
const validate = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');
const { isResellerPriceValid } = require('../services/pricing');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');

// All reseller routes require Bearer token auth
router.use(resellerAuth);

// ─── Get Available Products ──────────────────────────────
// GET /api/v1/products
// Returns unsold products. Must NOT include cost_price or margin_percentage.
router.get('/products', async (req, res, next) => {
  try {
    const products = await Coupon.find({ is_sold: false, is_deleted: false })
      .select('name description image_url minimum_sell_price')
      .sort({ created_at: -1 });

    const result = products.map(p => ({
      id: p._id,
      name: p.name,
      description: p.description,
      image_url: p.image_url,
      price: p.minimum_sell_price
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Get Product By ID ──────────────────────────────────
// GET /api/v1/products/:productId
router.get('/products/:productId', async (req, res, next) => {
  try {
    const product = await Coupon.findOne({
      _id: req.params.productId,
      is_sold: false,
      is_deleted: false
    }).select('name description image_url minimum_sell_price');

    if (!product) {
      throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404);
    }

    res.json({
      id: product._id,
      name: product.name,
      description: product.description,
      image_url: product.image_url,
      price: product.minimum_sell_price
    });
  } catch (err) {
    next(err);
  }
});

// ─── Purchase Product ────────────────────────────────────
// POST /api/v1/products/:productId/purchase
// Body: { reseller_price: number }
const purchaseValidation = [
  body('reseller_price')
    .isFloat({ gt: 0 })
    .withMessage('reseller_price must be a positive number')
];

router.post('/products/:productId/purchase', purchaseValidation, validate, async (req, res, next) => {
  try {
    const { reseller_price } = req.body;

    // First lookup the coupon to validate price before attempting atomic sell
    const coupon = await Coupon.findOne({
      _id: req.params.productId,
      is_deleted: false
    });

    if (!coupon) {
      throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404);
    }

    if (coupon.is_sold) {
      throw new AppError('PRODUCT_ALREADY_SOLD', 'Product has already been sold', 409);
    }

    // Validate reseller_price >= minimum_sell_price
    if (!isResellerPriceValid(reseller_price, coupon.minimum_sell_price)) {
      throw new AppError(
        'RESELLER_PRICE_TOO_LOW',
        `reseller_price must be >= ${coupon.minimum_sell_price}`,
        400
      );
    }

    // Atomically mark as sold — prevents race condition / double-sell
    const sold = await Coupon.findOneAndUpdate(
      {
        _id: req.params.productId,
        is_sold: false,
        is_deleted: false
      },
      { $set: { is_sold: true } },
      { new: true }
    );

    if (!sold) {
      // Lost the race — another buyer got it between our check and update
      throw new AppError('PRODUCT_ALREADY_SOLD', 'Product has already been sold', 409);
    }

    // Record the order
    await Order.create({
      coupon_id: sold._id,
      channel: 'reseller',
      reseller_id: req.reseller._id,
      price_paid: reseller_price,
      minimum_sell_price_at_purchase: sold.minimum_sell_price
    });

    // Return coupon value on success
    res.json({
      product_id: sold._id,
      final_price: reseller_price,
      value_type: sold.value_type,
      value: sold.value
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
