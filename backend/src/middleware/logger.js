const { sql, getPool } = require('../config/db');

function apiLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', async () => {
    const duration = Date.now() - start;
    const actionType = `${req.method} ${req.baseUrl}${req.path}`;
    const endpoint = req.originalUrl;
    const userId = req.user ? req.user.user_id : null;
    const ip = req.ip || req.connection.remoteAddress;
    const details = JSON.stringify({
      statusCode: res.statusCode,
      durationMs: duration,
      query: req.query,
      hasBody: !!req.body && Object.keys(req.body).length > 0
    });

    // Don't log system/stats polling to prevent log clutter
    if (endpoint.includes('/api/admin/logs') || endpoint.includes('/favicon.ico')) {
      return;
    }

    try {
      const pool = await getPool();
      await pool.request()
        .input('action', sql.NVarChar(100), actionType.substring(0, 100))
        .input('endpoint', sql.NVarChar(200), endpoint.substring(0, 200))
        .input('userId', sql.Int, userId)
        .input('details', sql.NVarChar(sql.MAX), details)
        .input('ip', sql.NVarChar(50), String(ip).substring(0, 50))
        .query(`
          INSERT INTO dbo.AuditLogs (action_type, endpoint, user_id, details, ip_address)
          VALUES (@action, @endpoint, @userId, @details, @ip)
        `);
    } catch (e) {
      // Async logging error should not block user response
      console.warn('Logging to DB skipped:', e.message);
    }
  });

  next();
}

module.exports = apiLogger;
