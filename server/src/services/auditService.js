const AuditLog = require('../models/AuditLog');

const logAction = async (req, action, details) => {
  try {
    const logData = {
      action,
      details,
      ipAddress: req ? (req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'System') : 'System',
      userAgent: req ? req.headers?.['user-agent'] || 'System' : 'System'
    };

    if (req && req.user) {
      logData.user = req.user._id;
      logData.username = req.user.username;
      logData.userRole = req.user.role;
    } else {
      logData.username = 'System/Guest';
      logData.userRole = 'guest';
    }

    await AuditLog.create(logData);
  } catch (err) {
    console.error(`Failed to create audit log: ${err.message}`);
  }
};

module.exports = { logAction };
