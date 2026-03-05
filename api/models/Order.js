const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const orderSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4
    },
    coupon_id: {
      type: String,
      required: true,
      ref: 'Product'
    },
    channel: {
      type: String,
      required: true,
      enum: ['direct', 'reseller']
    },
    reseller_id: {
      type: String,
      ref: 'Reseller',
      default: null
    },
    price_paid: {
      type: Number,
      required: true
    },
    minimum_sell_price_at_purchase: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

orderSchema.index({ coupon_id: 1 });
orderSchema.index({ reseller_id: 1 });

orderSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
