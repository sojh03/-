const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  securityQuestion: {
    type: String,
    default: "나의 보물 1호는?",
  },
  securityAnswer: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User',
  },
  profileImage: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('User', userSchema);
