const User = require('../models/User');
const { invalidateUserCache } = require('../middleware/auth');

exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, role, branch } = req.query;
    const query = {};
    if (status) query.status = status;
    if (role) query.role = role;
    if (branch) query.branch = branch;
    if (search) query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { username: new RegExp(search, 'i') },
    ];
    const [data, total] = await Promise.all([
      User.find(query).populate('role', 'name').populate('branch', 'name').skip((page - 1) * limit).limit(+limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);
    res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    const populated = await User.findById(user._id).populate('role', 'name').populate('branch', 'name');
    res.status(201).json(populated);
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { password, ...rest } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true })
      .populate('role', 'name').populate('branch', 'name');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password required' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = password;
    await user.save();
    res.json({ message: 'Password reset successfully' });
  } catch (err) { next(err); }
};

exports.toggleStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();
    invalidateUserCache(req.params.id);
    res.json({ status: user.status });
  } catch (err) { next(err); }
};
