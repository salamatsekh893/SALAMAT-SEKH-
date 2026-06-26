import mysql from 'mysql2/promise';

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });
  
  const [rows] = await pool.query('SELECT loan_no, id FROM loans WHERE loan_no = "LN-2026-0019"');
  console.log('Loan:', rows);
  if ((rows as any).length > 0) {
    const loanId = (rows as any)[0].id;
    const [cols] = await pool.query('SELECT amount_paid, status, remarks FROM collections WHERE loan_id = ?', [loanId]);
    console.log('Collections:', cols);
  }
  process.exit(0);
}
run();
