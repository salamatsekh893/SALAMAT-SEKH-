import mysql from 'mysql2/promise';

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1'
  });
  
  const [loans]: any = await connection.query('SELECT * FROM loans WHERE id = 19');
  console.log('Loan 19:', loans[0]);
  
  const [collections]: any = await connection.query('SELECT * FROM collections WHERE loan_id = 19');
  console.log('Collections for 19:', collections);
  
  connection.end();
}
check().catch(console.error);
