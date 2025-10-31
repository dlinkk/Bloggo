const express = require('express');
const cors = require('cors');
const apiRouter = require('./routes/api');
const { renderPublicBlog } = require('./render/blog');

const app = express();
app.use(express.json());
app.use(cors());

// Lightweight health check (does not touch Firestore)
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// Prevent favicon.ico requests from hitting the blog renderer (which touches Firestore)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// API routes
app.use('/api', apiRouter);

// Public blog renderer (catch-all)
app.use(renderPublicBlog);

module.exports = { app };
