const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const mannerReviewSchema = new mongoose.Schema({
  post:      { type: ObjectId, ref: 'ProductPost', required: true },
  reviewer:  { type: ObjectId, ref: 'User', required: true },
  reviewee:  { type: ObjectId, ref: 'User', required: true },
  recommend: { type: Boolean, required: true }, // true=추천, false=비추천
  createdAt: { type: Date, default: Date.now }
});

// 거래 1건당 리뷰어 1개만 허용
mannerReviewSchema.index({ post: 1, reviewer: 1 }, { unique: true });

module.exports = mongoose.model('MannerReview', mannerReviewSchema);
