const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Simple in-memory cache: userId -> { user, expiresAt }
const userCache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

const getCachedUser = async (id) => {
  const cached = userCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.user;
  const user = await User.findById(id)
    .populate({ path: 'role', populate: { path: 'permissions' } })
    .populate('branch', 'name code');
  if (user) userCache.set(id, { user, expiresAt: Date.now() + CACHE_TTL });
  return user;
};

const invalidateUserCache = (id) => userCache.delete(String(id));

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getCachedUser(decoded.id);
    if (!user || user.status === 'inactive') return res.status(401).json({ message: 'Not authorized' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

const can = (module, action) => (req, res, next) => {
  const permissions = req.user?.role?.permissions || [];
  const allowed = permissions.some(p => p.module === module && p.action === action);
  if (!allowed) return res.status(403).json({ message: 'Permission denied' });
  next();
};

const branchGuard = (req, res, next) => {
  const userBranch = req.user.branch?._id?.toString() || null;
  if (userBranch) {
    req.effectiveBranch = userBranch;
  } else {
    req.effectiveBranch = req.query.branch || req.body.branch || null;
  }
  next();
};

module.exports = { protect, can, branchGuard, invalidateUserCache };
