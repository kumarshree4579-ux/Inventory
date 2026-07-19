const AuditLog = require('../models/AuditLog');

const audit = (module, action) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    if (res.statusCode < 400) {
      AuditLog.create({
        user: req.user?._id,
        module,
        action,
        description: `${req.user?.name || 'Unknown'} performed ${action} on ${module}`,
        before: req._auditBefore || undefined,
        after: data?._id ? { id: data._id, ...data } : undefined,
        ip: req.ip || req.headers['x-forwarded-for'],
        device: req.headers['user-agent'],
        branch: req.user?.branch?._id || req.user?.branch,
      }).catch(() => {});
    }
    return originalJson(data);
  };
  next();
};

module.exports = audit;
