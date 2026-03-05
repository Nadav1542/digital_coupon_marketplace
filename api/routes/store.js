const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const { AppError } = require('../middleware/errorHandler');

// Fields safe to expose to customers (no pricing internals, no coupon value)
const PUBLIC_FIELDS = 'name description type image_url minimum_sell_price created_at';

// ─── List Available Products ─────────────────────────────
// Returns unsold, non-deleted coupons. Price shown = minimum_sell_price.
router.get('/products', async (req, res, next) => {
  try {
    const products = await Coupon.find({ is_sold: false, is_deleted: false })
      .select(PUBLIC_FIELDS)
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

// ─── Get Product By ID ───────────────────────────────────
router.get('/products/:id', async (req, res, next) => {
  try {
    const product = await Coupon.findOne({
      _id: req.params.id,
      is_sold: false,
      is_deleted: false
    }).select(PUBLIC_FIELDS);

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

// ─── Purchase Coupon ─────────────────────────────────────
// Direct customer pays minimum_sell_price (non-negotiable).
// Atomic: findOneAndUpdate with is_sold:false filter prevents double-sell.
router.post('/products/:id/purchase', async (req, res, next) => {
  try {
    // Atomically mark as sold — only succeeds if currently unsold & not deleted
    const coupon = await Coupon.findOneAndUpdate(
      {
        _id: req.params.id,
        is_sold: false,
        is_deleted: false
      },
      { $set: { is_sold: true } },
      { new: true }
    );

    if (!coupon) {
      // Determine why it failed
      const exists = await Coupon.findById(req.params.id);
      if (!exists || exists.is_deleted) {
        throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404);
      }
      throw new AppError('PRODUCT_ALREADY_SOLD', 'Product has already been sold', 409);
    }

    // Record the order
    await Order.create({
      coupon_id: coupon._id,
      channel: 'direct',
      price_paid: coupon.minimum_sell_price,
      minimum_sell_price_at_purchase: coupon.minimum_sell_price
    });

    // Return coupon value only after successful purchase
    res.json({
      product_id: coupon._id,
      final_price: coupon.minimum_sell_price,
      value_type: coupon.value_type,
      value: coupon.value
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
