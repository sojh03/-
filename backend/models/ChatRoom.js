const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductPost', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastMessage: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
  // 사용자별 마지막 읽은 시간
  lastRead: {
    type: Map,
    of: Date,
    default: {}
  }
});

chatRoomSchema.index({ post: 1, buyer: 1, seller: 1 }, { unique: true });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
