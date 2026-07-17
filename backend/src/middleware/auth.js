const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id)
      .populate({ path: 'role', populate: { path: 'permissions' } })
      .populate('branch', 'name code');
    if (!req.user || req.user.status === 'inactive') return res.status(401).json({ message: 'Not authorized' });
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

module.exports = { protect, can };
