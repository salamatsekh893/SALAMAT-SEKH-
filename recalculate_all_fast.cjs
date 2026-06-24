const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });

  try {
    const [branches] = await pool.query("SELECT id, branch_name FROM branches");
    console.log("Branches:", branches);

    // Generate date list from 2026-05-15 to 2026-06-25
    const dates = [];
    let curDate = new Date('2026-05-15');
    const endDate = new Date('2026-06-25');
    while (curDate <= endDate) {
      dates.push(curDate.toISOString().split('T')[0]);
      curDate.setDate(curDate.getDate() + 1);
    }

    for (const b of branches) {
      if (b.id === 1) continue; // Skip Head Office
      console.log(`\n--- RECALCULATING ${b.branch_name} (ID: ${b.id}) FAST ---`);

      // 1. Fetch Collections
      const [colRows] = await pool.query(
        "SELECT DATE_FORMAT(payment_date, '%Y-%m-%d') as d, SUM(amount_paid) as amt FROM collections WHERE branch_id = ? AND status = 'approved' GROUP BY d",
        [b.id]
      );
      const colsMap = {};
      colRows.forEach(r => colsMap[r.d] = parseFloat(r.amt || 0));

      // 2. Fetch Savings Deposits and Withdrawals
      const [savRows] = await pool.query(
        `SELECT DATE_FORMAT(st.date, '%Y-%m-%d') as d, st.type, SUM(st.amount) as amt 
         FROM savings_transactions st 
         JOIN savings_accounts sa ON st.savings_account_id = sa.id 
         JOIN members m ON sa.member_id = m.id 
         WHERE m.branch_id = ? 
         GROUP BY d, st.type`,
        [b.id]
      );
      const savDepMap = {};
      const savWithMap = {};
      savRows.forEach(r => {
        if (r.type === 'deposit') savDepMap[r.d] = parseFloat(r.amt || 0);
        else if (r.type === 'withdrawal') savWithMap[r.d] = parseFloat(r.amt || 0);
      });

      // 3. Product Sales (Cash)
      const [saleRows] = await pool.query(
        `SELECT DATE_FORMAT(s.sale_date, '%Y-%m-%d') as d, SUM(s.total_amount) as amt 
         FROM sales s 
         JOIN members m ON s.member_id = m.id 
         WHERE m.branch_id = ? AND LOWER(s.payment_method) = 'cash'
         GROUP BY d`,
        [b.id]
      );
      const salesMap = {};
      saleRows.forEach(r => salesMap[r.d] = parseFloat(r.amt || 0));

      // 4. Bank Transactions
      const [bankTxRows] = await pool.query(
        `SELECT DATE_FORMAT(date, '%Y-%m-%d') as d, type, SUM(amount) as amt 
         FROM bank_transactions 
         WHERE source_type = 'branch' AND source_id = ? 
         GROUP BY d, type`,
        [b.id]
      );
      const bankWithMap = {};
      const bankDepMap = {};
      bankTxRows.forEach(r => {
        if (r.type === 'withdrawal') bankWithMap[r.d] = parseFloat(r.amt || 0);
        else if (r.type === 'deposit') bankDepMap[r.d] = parseFloat(r.amt || 0);
      });

      // 5. Loan Fees and Wallet Disbursements
      const [loanRows] = await pool.query(
        `SELECT DATE_FORMAT(COALESCE(disbursement_date, start_date), '%Y-%m-%d') as d, 
                SUM(processing_fee + insurance_fee) as fees,
                SUM(CASE WHEN disbursement_method = 'wallet' THEN amount ELSE 0 END) as wallet_disb
         FROM loans 
         WHERE branch_id = ? AND status IN ('active', 'closed')
         GROUP BY d`,
        [b.id]
      );
      const loanFeesMap = {};
      const walletDisbMap = {};
      loanRows.forEach(r => {
        loanFeesMap[r.d] = parseFloat(r.fees || 0);
        walletDisbMap[r.d] = parseFloat(r.wallet_disb || 0);
      });

      // 6. Salaries
      const [salaryRows] = await pool.query(
        "SELECT DATE_FORMAT(payment_date, '%Y-%m-%d') as d, SUM(net_salary) as amt FROM salaries WHERE branch_id = ? GROUP BY d",
        [b.id]
      );
      const salaryMap = {};
      salaryRows.forEach(r => salaryMap[r.d] = parseFloat(r.amt || 0));

      // 7. Expenses (Cash)
      const [expenseRows] = await pool.query(
        "SELECT DATE_FORMAT(date, '%Y-%m-%d') as d, SUM(amount) as amt FROM expenses WHERE branch_id = ? AND payment_method = 'cash' GROUP BY d",
        [b.id]
      );
      const expenseMap = {};
      expenseRows.forEach(r => expenseMap[r.d] = parseFloat(r.amt || 0));

      // 8. Activity check maps
      const [actCol] = await pool.query("SELECT DATE_FORMAT(payment_date, '%Y-%m-%d') as d, COUNT(*) as c FROM collections WHERE branch_id = ? GROUP BY d", [b.id]);
      const [actSav] = await pool.query("SELECT DATE_FORMAT(st.date, '%Y-%m-%d') as d, COUNT(*) as c FROM savings_transactions st JOIN savings_accounts sa ON st.savings_account_id = sa.id JOIN members m ON sa.member_id = m.id WHERE m.branch_id = ? GROUP BY d", [b.id]);
      const [actExp] = await pool.query("SELECT DATE_FORMAT(date, '%Y-%m-%d') as d, COUNT(*) as c FROM expenses WHERE branch_id = ? GROUP BY d", [b.id]);
      const [actLoan] = await pool.query("SELECT DATE_FORMAT(COALESCE(disbursement_date, start_date), '%Y-%m-%d') as d, COUNT(*) as c FROM loans WHERE branch_id = ? GROUP BY d", [b.id]);

      const activityMap = {};
      const addAct = (rows) => rows.forEach(r => activityMap[r.d] = (activityMap[r.d] || 0) + r.c);
      addAct(actCol); addAct(actSav); addAct(actExp); addAct(actLoan);

      // 9. Existing DCB rows
      const [dcbRows] = await pool.query(
        "SELECT DATE_FORMAT(date, '%Y-%m-%d') as d, status FROM daily_cash_balances WHERE branch_id = ?",
        [b.id]
      );
      const dcbStatusMap = {};
      dcbRows.forEach(r => dcbStatusMap[r.d] = r.status);

      let prevClosing = 0;

      for (const dStr of dates) {
        const opening_balance = prevClosing;

        const col_amt = colsMap[dStr] || 0;
        const sav_dep = savDepMap[dStr] || 0;
        const sale_amt = salesMap[dStr] || 0;
        const bank_with = bankWithMap[dStr] || 0;
        const loan_fees = loanFeesMap[dStr] || 0;

        const total_inflow = col_amt + sav_dep + sale_amt + bank_with + loan_fees;

        const sav_with = savWithMap[dStr] || 0;
        const sal_amt = salaryMap[dStr] || 0;
        const exp_amt = expenseMap[dStr] || 0;
        const bank_dep = bankDepMap[dStr] || 0;
        const wallet_disb = walletDisbMap[dStr] || 0;

        const total_outflow = sav_with + sal_amt + exp_amt + bank_dep + wallet_disb;

        const closing_balance = opening_balance + total_inflow - total_outflow;

        const activity_count = activityMap[dStr] || 0;
        const hasDcbRow = dcbStatusMap[dStr] !== undefined;

        if (activity_count > 0 || hasDcbRow || dStr === '2026-06-23' || dStr === '2026-06-24') {
          const status = dcbStatusMap[dStr] || 'closed';
          await pool.query(
            `INSERT INTO daily_cash_balances (branch_id, date, opening_balance, total_inflow, total_outflow, closing_balance, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             opening_balance = VALUES(opening_balance),
             total_inflow = VALUES(total_inflow),
             total_outflow = VALUES(total_outflow),
             closing_balance = VALUES(closing_balance)`,
            [b.id, dStr, opening_balance, total_inflow, total_outflow, closing_balance, status]
          );
        }

        prevClosing = closing_balance;
      }

      console.log(`Setting Branch ${b.branch_name} wallet_balance to ${prevClosing}`);
      await pool.query("UPDATE branches SET wallet_balance = ? WHERE id = ?", [prevClosing, b.id]);
    }

    console.log("\nAll branch balances recalculated and updated ultra-fast!");
  } catch (err) {
    console.error("Error doing fast cleanup:", err);
  } finally {
    await pool.end();
  }
}

main();
