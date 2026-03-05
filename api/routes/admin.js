const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const adminAuth = require('../middleware/adminAuth');
const validate = require('../middleware/validate');
const {
  loginValidation,
  createCouponValidation,
  updateCouponValidation,
  createResellerValidation
} = require('../middleware/validators');
const { AppError } = require('../middleware/errorHandler');

const Admin = require('../models/Admin');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const Reseller = require('../models/Reseller');

// ─── Health ──────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ status: 'ok', role: 'admin' });
});

// ─── Login ───────────────────────────────────────────────
router.post('/login', loginValidation, validate, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) {
      throw new AppError('UNAUTHORIZED', 'Invalid username or password', 401);
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw new AppError('UNAUTHORIZED', 'Invalid username or password', 401);
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30m' }
    );

    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// ─── All routes below require admin auth ─────────────────
router.use(adminAuth);

// ─── Create Coupon ───────────────────────────────────────
router.post('/products', createCouponValidation, validate, async (req, res, next) => {
  try {
    const { name, description, image_url, cost_price, margin_percentage, value_type, value } = req.body;

    const coupon = new Coupon({
      name,
      description,
      image_url,
      cost_price,
      margin_percentage,
      value_type,
      value
    });

    await coupon.save();

    res.status(201).json(coupon);
  } catch (err) {
    next(err);
  }
});

// ─── List Products ───────────────────────────────────────
router.get('/products', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, is_sold, is_deleted } = req.query;

    const filter = {};
    if (is_sold !== undefined) filter.is_sold = is_sold === 'true';
    if (is_deleted !== undefined) filter.is_deleted = is_deleted === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(filter)
    ]);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get Product By ID ──────────────────────────────────
router.get('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404);
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// ─── Update Product ──────────────────────────────────────
router.put('/products/:id', updateCouponValidation, validate, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404);
    }

    // Sold coupons cannot be updated at all
    if (product.is_sold) {
      throw new AppError('PRODUCT_ALREADY_SOLD', 'Cannot update a sold coupon', 409);
    }

    // Whitelist allowed fields
    const allowedFields = ['name', 'description', 'image_url', 'cost_price', 'margin_percentage', 'value_type', 'value'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    }

    // minimum_sell_price is recomputed automatically by the Mongoose pre-validate hook
    await product.save();

    res.json(product);
  } catch (err) {
    next(err);
  }
});

// ─── Delete Product ──────────────────────────────────────
router.delete('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404);
    }

    if (product.is_sold) {
      throw new AppError('PRODUCT_ALREADY_SOLD', 'Cannot delete a sold coupon', 409);
    }

    product.is_deleted = true;
    await product.save();

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── Create Reseller ─────────────────────────────────────
router.post('/resellers', createResellerValidation, validate, async (req, res, next) => {
  try {
    const { name } = req.body;

    // Generate a raw token (shown once) and store its hash
    const rawToken = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const reseller = await Reseller.create({
      name,
      token_hash: tokenHash
    });

    res.status(201).json({
      id: reseller._id,
      name: reseller.name,
      token: rawToken,
      message: 'Save this token — it will not be shown again'
    });
  } catch (err) {
    next(err);
  }
});

// ─── List Resellers ──────────────────────────────────────
router.get('/resellers', async (req, res, next) => {
  try {
    const resellers = await Reseller.find().sort({ created_at: -1 });
    res.json({ resellers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
