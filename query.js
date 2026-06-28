import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'u926896353_aljooya1',
    password: process.env.DB_PASSWORD || 'rayhan123456',
    database: 'u926896353_aljooya1'
  });
  const [rows] = await pool.query("SELECT id, installment, amount, duration_weeks, no_of_emis, total_repayment FROM loans WHERE customer_id = (SELECT id FROM members WHERE member_code = 'MEM-2026-2850')");
  console.log(rows);
  process.exit(0);
}
run();
