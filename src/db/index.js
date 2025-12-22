require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Handle fatal pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Test connection once (useful for startup checks)
async function testConnection() {
  try {
    await pool.query("SELECT 1");
    console.log("Connected to PostgreSQL database");
  } catch (err) {
    console.error(
      "Failed to connect to PostgreSQL database",
      err.message || err
    );
    throw err;
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  testConnection,
};
