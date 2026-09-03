const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

if (!process.env.DB_CONNECTION_STRING) {
  console.error('❌ FATAL: DB_CONNECTION_STRING environment variable is not set. Please configure it in your .env file.');
  process.exit(1);
}
const connectionString = process.env.DB_CONNECTION_STRING;

const config = {
  connectionString,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    trustedConnection: true,
    trustServerCertificate: true
  }
};

let pool = null;

async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('🔗 Connected successfully to SSMS 2022 / SQL Server (SoftwareCommerceDB)');
    } catch (err) {
      console.error('❌ SQL Server connection error:', err);
      throw err;
    }
  }
  return pool;
}

module.exports = {
  sql,
  getPool
};
