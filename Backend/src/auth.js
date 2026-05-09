const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const USERNAME      = process.env.APP_USERNAME;
const PASSWORD_HASH = process.env.APP_PASSWORD_HASH;
const JWT_SECRET    = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m';
const OTP_TO_EMAIL  = process.env.OTP_TO_EMAIL;   // karimarafa9@gmail.com
const OTP_TTL_MS    = 5 * 60 * 1000;              // 5 minutes

// ── In-memory OTP store ───────────────────────────────────────────────────────
let otpStore = null; // { code, expiresAt, attempts }

// ── Nodemailer transporter (Gmail SMTP) ───────────────────────────────────────
function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,  // your Gmail address
      pass: process.env.SMTP_PASS,  // Gmail App Password (16 chars)
    },
  });
}

// ── Generate 6-digit OTP ─────────────────────────────────────────────────────
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
async function sendOtp(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const usernameMatch = username === USERNAME;
  const passwordMatch = usernameMatch && await bcrypt.compare(password, PASSWORD_HASH);

  if (!usernameMatch || !passwordMatch) {
    return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
  }

  const code = generateOtp();
  otpStore = { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 };

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"نظام ادارة الحجاج" <${process.env.SMTP_USER}>`,
        to: 'karafa552@gmail.com',
        cc: '',
        priority: 'high',
        headers: {
          'X-Priority': '1 (Highest)',
          'X-MSMail-Priority': 'High',
          'Importance': 'High',
        },
        subject: `رمز التحقق: ${code}`,
        html: `
          <div dir="rtl" style="font-family:Cairo,Arial,sans-serif;max-width:480px;margin:0 auto;
                background:#0d2411;border:1px solid #c9a84c;border-radius:16px;padding:32px;color:#f7f0e0;">
            <h2 style="color:#e8c97e;margin:0 0 8px">🕋 فندق الأرض المتميزة</h2>
            <p style="color:rgba(247,240,224,0.7);margin:0 0 24px;font-size:14px">نظام إدارة الحجاج — حج ١٤٤٧ هـ</p>
            <p style="margin:0 0 16px">رمز التحقق الخاص بك:</p>
            <div style="background:#122a16;border:2px solid #c9a84c;border-radius:12px;
                        padding:20px;text-align:center;letter-spacing:12px;
                        font-size:36px;font-weight:700;color:#e8c97e;">
              ${code}
            </div>
            <p style="margin:20px 0 0;font-size:13px;color:rgba(247,240,224,0.5);">
              صالح لمدة <strong style="color:#e8c97e">5 دقائق</strong> فقط. لا تشاركه مع أحد.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Email error:', err.message);
      return res.status(500).json({ message: 'فشل إرسال رمز التحقق، تحقق من إعدادات البريد' });
    }
  } else {
    // Dev mode — print to console
    console.log(`[DEV] OTP → ${OTP_TO_EMAIL}: ${code}`);
  }

  // Mask email: k***a@gmail.com
  const masked = OTP_TO_EMAIL
    ? OTP_TO_EMAIL.replace(/^(.{1}).*(@.*)$/, '$1***$2')
    : '***@***';

  return res.json({ sent: true, maskedEmail: masked });
}

// ── POST /api/auth/login (verify OTP) ────────────────────────────────────────
async function login(req, res) {
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ message: 'رمز التحقق مطلوب' });
  }

  if (!otpStore) {
    return res.status(400).json({ message: 'يرجى طلب رمز التحقق أولاً' });
  }

  if (Date.now() > otpStore.expiresAt) {
    otpStore = null;
    return res.status(401).json({ message: 'انتهت صلاحية الرمز، اطلب رمزاً جديداً' });
  }

  otpStore.attempts += 1;
  if (otpStore.attempts > 5) {
    otpStore = null;
    return res.status(429).json({ message: 'تجاوزت عدد المحاولات، اطلب رمزاً جديداً' });
  }

  if (otp !== otpStore.code) {
    const left = 5 - otpStore.attempts;
    return res.status(401).json({ message: `رمز التحقق غير صحيح — تبقى ${left} محاولات` });
  }

  otpStore = null;
  const token = jwt.sign({ username: USERNAME }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return res.json({ token, expiresIn: JWT_EXPIRES_IN });
}

// ── JWT middleware ────────────────────────────────────────────────────────────
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'انتهت جلسة العمل' });
    req.user = user;
    next();
  });
}

module.exports = { sendOtp, login, verifyToken };
