const AuditLog = require('../models/AuditLog');

const audit = (module, action) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (res.statusCode < 400) {
      await AuditLog.create({
        user: req.user?._id,
        module,
        action,
        description: `${action} on ${module}`,
        ip: req.ip,
        device: req.headers['user-agent'],
        branch: req.user?.branch,
      }).catch(() => {});
    }
    return originalJson(data);
  };
  next();
};

module.exports = audit;
