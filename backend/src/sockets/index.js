const jwt = require('jsonwebtoken');
const User = require('../models/User');

const initSocket = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.id).populate('branch');
      next();
    } catch {
      next(new Error('Token invalid'));
    }
  });

  io.on('connection', (socket) => {
    const branchId = socket.user?.branch?._id?.toString();
    if (branchId) socket.join(`branch_${branchId}`);

    socket.on('counter_update', (data) => {
      // Only broadcast to the sender's own branch — prevents cross-branch spoofing
      if (branchId) io.to(`branch_${branchId}`).emit('counter_update', data);
    });

    socket.on('disconnect', () => {
      if (branchId) socket.leave(`branch_${branchId}`);
    });
  });
};

module.exports = initSocket;
