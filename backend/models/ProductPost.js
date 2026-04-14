const mongoose = require('mongoose');

const productPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  imagePath: {
    type: String,
    default: null,
  },
  manualPath: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['OnSale', 'SoldOut', 'Hidden'],
    default: 'OnSale',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('ProductPost', productPostSchema);
