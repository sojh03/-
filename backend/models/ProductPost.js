const mongoose = require('mongoose');

const productPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  price: { type: Number, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // 이미지: 단일(레거시) + 다중
  imagePath: { type: String, default: null },
  imagePaths: { type: [String], default: [] },

  manualPath: { type: String, default: null },

  // 상품 메타
  category: {
    type: String,
    enum: ['노트북/PC', '스마트폰', '태블릿', '카메라', '오디오', '게임/콘솔', '주변기기', '기타'],
    default: '기타'
  },
  condition: {
    type: String,
    enum: ['미개봉', '거의새것', '중고'],
    default: '중고'
  },
  tradeType: {
    type: String,
    enum: ['직거래', '택배', '상관없음'],
    default: '상관없음'
  },

  status: {
    type: String,
    enum: ['OnSale', 'SoldOut', 'Hidden'],
    default: 'OnSale'
  },

  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  bumpedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProductPost', productPostSchema);
