const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const resellerSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4
    },
    name: {
      type: String,
      required: [true, 'Reseller name is required'],
      trim: true
    },
    token_hash: {
      type: String,
      required: true
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

resellerSchema.index({ token_hash: 1 });

resellerSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.token_hash;
    delete ret.__v;
    return ret;
  }
});

const Reseller = mongoose.model('Reseller', resellerSchema);

module.exports = Reseller;
