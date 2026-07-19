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

// Resolves the effective branch for a request.
// - Branch users: always locked to their own branch, cannot override via query/body.
// - Admins (no branch): can pass ?branch=id or body.branch, or get null (all branches).
const branchGuard = (req, res, next) => {
  const userBranch = req.user.branch?._id?.toString() || req.user.branch?.toString() || null;
  if (userBranch) {
    // Branch-scoped user — ignore any branch param from client
    req.effectiveBranch = userBranch;
  } else {
    // Admin/owner — allow optional branch filter
    req.effectiveBranch = req.query.branch || req.body.branch || null;
  }
  next();
};

module.exports = { protect, can, branchGuard };
