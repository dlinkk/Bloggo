const express = require('express');
const publicRouter = require('./public');
const uploadsRouter = require('./protected/uploads');
const blogsRouter = require('./protected/blogs');
const postsRouter = require('./protected/posts');
const usersRouter = require('./protected/users');
const analyticsRouter = require('./protected/analytics');
const commentsRouter = require('./protected/comments');
const { checkAuth } = require('../../middleware/auth');

const router = express.Router();

// Public routes
router.use(publicRouter);

// Protected routes (require auth)
router.use(checkAuth);
router.use(uploadsRouter);
router.use(blogsRouter);
router.use(postsRouter);
router.use(usersRouter);
router.use(analyticsRouter);
router.use(commentsRouter);

module.exports = router;
