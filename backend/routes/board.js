const express = require('express');
const ProductPost = require('../models/ProductPost');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
// [VULN] File Upload: fileFilter 없음 - .html/.js 등 모든 파일 허용
const upload = multer({ storage: storage });

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

router.get('/', async (req, res) => {
  try {
    const { adminView, keyword } = req.query;
    let query = adminView === 'true' ? {} : { status: { $ne: 'Hidden' } };

    if (keyword && keyword.trim() !== '') {
      const regex = new RegExp(keyword.trim(), 'i');
      query = { ...query, $or: [{ title: regex }, { content: regex }] };
    }

    const posts = await ProductPost.find(query).populate('author', 'userId').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'manual', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, content, price } = req.body;
    let imagePath = null;
    let manualPath = null;
    
    if (req.files['image']) {
      imagePath = req.files['image'][0].filename;
    }
    if (req.files['manual']) {
      manualPath = req.files['manual'][0].filename;
    }

    const newPost = new ProductPost({
      title,
      content,
      price,
      author: req.user.id,
      imagePath,
      manualPath
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const post = await ProductPost.findById(req.params.id).populate('author', 'userId');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const post = await ProductPost.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // [VULN] IDOR: 소유권 검사 없음 - 로그인한 사용자면 누구든 타인 게시물 수정 가능
        const { title, content, price, status } = req.body;
        if(title) post.title = title;
        if(content) post.content = content;
        if(price) post.price = price;
        if(status) post.status = status;

        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const post = await ProductPost.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // [VULN] IDOR: 소유권 검사 없음 - 로그인한 사용자면 누구든 타인 게시물 삭제 가능
        await ProductPost.deleteOne({ _id: post._id });
        res.json({ message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.get('/download/:filename', (req, res) => {
    const file = path.join(__dirname, '..', 'uploads', req.params.filename);
    res.download(file);
});

module.exports = router;
