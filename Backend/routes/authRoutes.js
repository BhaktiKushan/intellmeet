import express from 'express';
import User from '../models/User.js';
import { protect, generateTokens } from '../middleware/auth.js';

const router = express.Router();

// Register User
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, title, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'member',
      title: title || 'Team Member',
      department: department || 'Engineering',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
    });

    const { accessToken, refreshToken } = generateTokens(user._id);
    const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        userId: user.userId || `USR-${user._id.toString().slice(-6).toUpperCase()}`,
        sessionId,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        department: user.department,
        avatar: user.avatar,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login User
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.userId) {
      user.userId = `USR-${user._id.toString().slice(-6).toUpperCase()}`;
      await user.save().catch(() => {});
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;

    res.json({
      success: true,
      data: {
        _id: user._id,
        userId: user.userId,
        sessionId,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        department: user.department,
        avatar: user.avatar,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

// Demo Login (Instant evaluation without manual registration)
router.post('/demo-login', async (req, res, next) => {
  try {
    const { role = 'admin' } = req.body;

    const email = role === 'admin' ? 'admin@intellmeet.com' : 'sarah.engineer@intellmeet.com';
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: role === 'admin' ? 'Alex Rivera (VP of Engineering)' : 'Sarah Chen (Lead Architect)',
        email,
        password: 'Password123!',
        role: role === 'admin' ? 'admin' : 'member',
        title: role === 'admin' ? 'VP of Engineering' : 'Lead Architect',
        department: 'Cloud & Infrastructure',
        avatar: role === 'admin'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
      });
    }

    if (!user.userId) {
      user.userId = `USR-${user._id.toString().slice(-6).toUpperCase()}`;
      await user.save().catch(() => {});
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;

    res.json({
      success: true,
      message: `Demo logged in as ${user.name}`,
      data: {
        _id: user._id,
        userId: user.userId,
        sessionId,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        department: user.department,
        avatar: user.avatar,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get Current Profile
router.get('/me', protect, async (req, res) => {
  const userData = req.user.toObject ? req.user.toObject() : { ...req.user };
  if (!userData.userId && userData._id) {
    userData.userId = `USR-${userData._id.toString().slice(-6).toUpperCase()}`;
    await User.findByIdAndUpdate(userData._id, { userId: userData.userId }).catch(() => {});
  }
  res.json({
    success: true,
    data: userData
  });
});

// Update Profile
router.put('/profile', protect, async (req, res, next) => {
  try {
    const { name, title, department, avatar, status } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (title) user.title = title;
    if (department) user.department = department;
    if (avatar) user.avatar = avatar;
    if (status) user.status = status;

    await user.save();

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// List users for team invite and task assignees
router.get('/users', protect, async (req, res, next) => {
  try {
    const users = await User.find().select('name email role title department avatar status');
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

export default router;
