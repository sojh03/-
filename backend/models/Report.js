const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['post', 'user'], required: true },
  targetId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  targetName: { type: String, default: '' }, // 제목 또는 userId (표시용)
  reason:     { type: String, required: true },
  status:     { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
