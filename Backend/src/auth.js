const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const USERNAME = process.env.APP_USERNAME;
const PASSWORD_HASH = process.env.APP_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m';
const TIME_PIN_TOLERANCE = parseInt(process.env.TIME_PIN_TOLERANCE || '2', 10);

function validateTimePin(pin) {
  const now = new Date();
  const currentMinute = now.getMinutes();
  const provided = parseInt(pin, 10);
  if (isNaN(provided) || provided < 0 || provided > 59) return false;

  for (let delta = -TIME_PIN_TOLERANCE; delta <= TIME_PIN_TOLERANCE; delta++) {
    const expected = ((currentMinute + delta) % 60 + 60) % 60;
    if (provided === expected) return true;
  }
  return false;
}

async function login(req, res) {
  const { username, password, timePin } = req.body;

  if (!username || !password || timePin === undefined) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
  }

  const usernameMatch = username === USERNAME;
  const passwordMatch = usernameMatch && await bcrypt.compare(password, PASSWORD_HASH);
  const timePinValid = validateTimePin(String(timePin).padStart(2, '0'));

  if (!usernameMatch || !passwordMatch || !timePinValid) {
    return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return res.json({ token, expiresIn: JWT_EXPIRES_IN });
}

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

module.exports = { login, verifyToken };
