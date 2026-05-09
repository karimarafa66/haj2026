require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { sendOtp, login } = require('./src/auth');
const dataRouter = require('./src/dataRouter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:4200',
  'http://127.0.0.1:4200',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Strict rate limiter for OTP send (5 requests per 15 min per IP)
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'تم تجاوز الحد المسموح به، حاول بعد 15 دقيقة' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limiter for OTP verify (10 per 15 min per IP)
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'تم تجاوز الحد المسموح به، حاول بعد قليل' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth routes
app.post('/api/auth/send-otp', otpSendLimiter, sendOtp);
app.post('/api/auth/login', otpVerifyLimiter, login);

app.use('/api/data', dataRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((_req, res) => res.status(404).json({ message: 'المسار غير موجود' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

module.exports = app;
