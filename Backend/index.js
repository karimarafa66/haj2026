require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { login } = require('./src/auth');
const dataRouter = require('./src/dataRouter');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet());

// CORS — only allow the Angular frontend origin
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Rate limiter for login endpoint (max 10 attempts per 15 minutes per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'تم تجاوز الحد المسموح به، حاول بعد قليل' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.post('/api/auth/login', loginLimiter, login);
app.use('/api/data', dataRouter);

// Health check (public)
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Catch-all 404
app.use((_req, res) => res.status(404).json({ message: 'المسار غير موجود' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

module.exports = app;
