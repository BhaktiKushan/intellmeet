import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route. Token missing.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'intellmeet_super_secret_jwt_key_2026');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token is invalid or expired.' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user ? req.user.role : 'Guest'} is not authorized to perform this action.`
      });
    }
    next();
  };
};

export const generateTokens = (userId) => {
  const secret = process.env.JWT_SECRET || 'intellmeet_super_secret_jwt_key_2026';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'intellmeet_super_refresh_jwt_key_2026';

  // 200 days in seconds = 200 * 24 * 60 * 60 = 17,280,000 seconds
  const DEFAULT_SECONDS = 17280000;

  const parseExpiry = (val) => {
    if (!val) return DEFAULT_SECONDS;
    if (typeof val === 'number' && !isNaN(val)) return val;
    const clean = String(val).replace(/['"]/g, '').trim();
    if (!clean) return DEFAULT_SECONDS;
    if (/^\d+$/.test(clean)) return parseInt(clean, 10);
    if (/^\d+[smhdw]$/i.test(clean)) return clean;
    return DEFAULT_SECONDS;
  };

  const accessExpiry = parseExpiry(process.env.JWT_EXPIRE);
  const refreshExpiry = parseExpiry(process.env.JWT_REFRESH_EXPIRE);

  const accessToken = jwt.sign({ id: userId }, secret, {
    expiresIn: accessExpiry
  });

  const refreshToken = jwt.sign({ id: userId }, refreshSecret, {
    expiresIn: refreshExpiry
  });

  return { accessToken, refreshToken };
};
