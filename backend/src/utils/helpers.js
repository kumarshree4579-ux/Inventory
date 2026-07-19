const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');

const generateTokens = (id) => ({
  accessToken: jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }),
  refreshToken: jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }),
});

const generateBillNumber = (prefix = 'INV') => {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${datePart}-${rand}`;
};

const generatePONumber = () => generateBillNumber('PO');

const createNotification = async (io, data) => {
  const notification = await Notification.create(data);
  if (io) io.to(`branch_${data.branch}`).emit('notification', notification);
  return notification;
};

module.exports = { generateTokens, generateBillNumber, generatePONumber, createNotification };
