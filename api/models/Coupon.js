const mongoose = require('mongoose');
const Product = require('./Product');

const couponSchema = new mongoose.Schema({
  cost_price: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost price must be >= 0']
  },
  margin_percentage: {
    type: Number,
    required: [true, 'Margin percentage is required'],
    min: [0, 'Margin percentage must be >= 0']
  },
  minimum_sell_price: {
    type: Number,
    required: true
  },
  is_sold: {
    type: Boolean,
    default: false
  },
  value_type: {
    type: String,
    required: [true, 'Value type is required'],
    enum: {
      values: ['STRING', 'IMAGE'],
      message: 'Value type must be STRING or IMAGE'
    }
  },
  value: {
    type: String,
    required: [true, 'Coupon value is required']
  }
});

/**
 * Pre-validate hook: compute minimum_sell_price from cost_price and margin_percentage.
 * This runs before every save, ensuring the price is always server-computed.
 */
couponSchema.pre('validate', function (next) {
  if (this.cost_price != null && this.margin_percentage != null) {
    this.minimum_sell_price = +(this.cost_price * (1 + this.margin_percentage / 100)).toFixed(2);
  }
  next();
});

const Coupon = Product.discriminator('COUPON', couponSchema);

module.exports = Coupon;
