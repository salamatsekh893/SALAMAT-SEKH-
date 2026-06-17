const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });

  try {
    const conn = await pool.getConnection();

    // Query groups
    const [groups] = await pool.query("SELECT id, group_name, meeting_day FROM groups");
    console.log("Groups and their meeting days:");
    console.log(groups);

    conn.release();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
