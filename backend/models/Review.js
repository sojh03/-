const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  post:     { type: mongoose.Schema.Types.ObjectId, ref: 'ProductPost', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating:   { type: Number, required: true, min: 1, max: 5 },
  comment:  { type: String, default: '' },
  createdAt:{ type: Date, default: Date.now }
});

// 게시글 당 리뷰어 1개만 허용
reviewSchema.index({ post: 1, reviewer: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
