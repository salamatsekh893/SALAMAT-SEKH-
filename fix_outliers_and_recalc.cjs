const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });

  try {
    console.log("=== STEP 1: CORRECTING OUTLIER COLLECTIONS ===");
    
    // 1. Correct Collection ID 206 (Memari)
    const [res206] = await pool.query(
      "UPDATE collections SET amount_paid = 770.00 WHERE id = 206 AND amount_paid = 7692670.00"
    );
    console.log("Collection 206 update result:", res206);

    // 2. Correct Collection ID 230 (Bhatar)
    const [res230] = await pool.query(
      "UPDATE collections SET amount_paid = 770.00 WHERE id = 230 AND amount_paid = 7769570.00"
    );
    console.log("Collection 230 update result:", res230);

    console.log("\n=== STEP 2: RECALCULATING ALL BRANCH CASH BALANCES ===");
    const [branches] = await pool.query("SELECT id, branch_name FROM branches");
    console.log("Branches to process:", branches);

    // Generate date sequence
    const dates = [];
    let curDate = new Date('2026-05-15');
    const endDate = new Date('2026-06-25');
    while (curDate <= endDate) {
      dates.push(curDate.toISOString().split('T')[0]);
      curDate.setDate(curDate.getDate() + 1);
    }

    for (const b of branches) {
      if (b.id === 1) continue; // Skip Head Office
      console.log(`\nProcessing Branch: ${b.branch_name} (ID: ${b.id})`);

      let prevClosing = 0;

      for (const dStr of dates) {
        const opening_balance = prevClosing;

        // Inflows
        // 1. Approved Collections
        const [[{ col_amt }]] = await pool.query(
          "SELECT COALESCE(SUM(amount_paid), 0) as col_amt FROM collections WHERE branch_id = ? AND DATE(payment_date) = ? AND status = 'approved'",
          [b.id, dStr]
        );

        // 2. Savings Deposits
        const [[{ sav_dep }]] = await pool.query(
          `SELECT COALESCE(SUM(st.amount), 0) as sav_dep 
           FROM savings_transactions st 
           JOIN savings_accounts sa ON st.savings_account_id = sa.id 
           JOIN members m ON sa.member_id = m.id 
           WHERE m.branch_id = ? AND DATE(st.date) = ? AND st.type = 'deposit'`,
          [b.id, dStr]
        );

        // 3. Product Sales (Cash)
        const [[{ sale_amt }]] = await pool.query(
          `SELECT COALESCE(SUM(s.total_amount), 0) as sale_amt 
           FROM sales s 
           JOIN members m ON s.member_id = m.id 
           WHERE m.branch_id = ? AND DATE(s.sale_date) = ? AND LOWER(s.payment_method) = 'cash'`,
          [b.id, dStr]
        );

        // 4. Bank Withdrawals (Cash box inflow)
        const [[{ bank_with }]] = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as bank_with 
           FROM bank_transactions 
           WHERE type = 'withdrawal' AND source_type = 'branch' AND source_id = ? AND DATE(date) = ?`,
          [b.id, dStr]
        );

        // 5. Loan Fees (Processing + Insurance)
        const [[{ loan_fees }]] = await pool.query(
          `SELECT COALESCE(SUM(processing_fee + insurance_fee), 0) as loan_fees 
           FROM loans 
           WHERE branch_id = ? AND DATE(COALESCE(disbursement_date, start_date)) = ? AND status IN ('active', 'closed')`,
          [b.id, dStr]
        );

        const total_inflow = parseFloat(col_amt || 0) + parseFloat(sav_dep || 0) + parseFloat(sale_amt || 0) + parseFloat(bank_with || 0) + parseFloat(loan_fees || 0);

        // Outflows
        // 1. Savings Withdrawals
        const [[{ sav_with }]] = await pool.query(
          `SELECT COALESCE(SUM(st.amount), 0) as sav_with 
           FROM savings_transactions st 
           JOIN savings_accounts sa ON st.savings_account_id = sa.id 
           JOIN members m ON sa.member_id = m.id 
           WHERE m.branch_id = ? AND DATE(st.date) = ? AND st.type = 'withdrawal'`,
          [b.id, dStr]
        );

        // 2. Salaries Paid
        const [[{ sal_amt }]] = await pool.query(
          "SELECT COALESCE(SUM(net_salary), 0) as sal_amt FROM salaries WHERE branch_id = ? AND DATE(payment_date) = ?",
          [b.id, dStr]
        );

        // 3. Expenses (Cash)
        const [[{ exp_amt }]] = await pool.query(
          "SELECT COALESCE(SUM(amount), 0) as exp_amt FROM expenses WHERE branch_id = ? AND DATE(date) = ? AND payment_method = 'cash'",
          [b.id, dStr]
        );

        // 4. Bank Deposits (Cash box outflow)
        const [[{ bank_dep }]] = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as bank_dep 
           FROM bank_transactions 
           WHERE type = 'deposit' AND source_type = 'branch' AND source_id = ? AND DATE(date) = ?`,
          [b.id, dStr]
        );

        // 5. Wallet Disbursements (Loan disbursed via branch wallet)
        const [[{ wallet_disb }]] = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as wallet_disb 
           FROM loans 
           WHERE branch_id = ? AND DATE(COALESCE(disbursement_date, start_date)) = ? AND status IN ('active', 'closed') AND disbursement_method = 'wallet'`,
          [b.id, dStr]
        );

        const total_outflow = parseFloat(sav_with || 0) + parseFloat(sal_amt || 0) + parseFloat(exp_amt || 0) + parseFloat(bank_dep || 0) + parseFloat(wallet_disb || 0);

        const closing_balance = opening_balance + total_inflow - total_outflow;

        // Check activity
        const [[{ activity_count }]] = await pool.query(
          `SELECT (
             SELECT COUNT(*) FROM collections WHERE branch_id = ? AND DATE(payment_date) = ?
           ) + (
             SELECT COUNT(*) FROM savings_transactions st JOIN savings_accounts sa ON st.savings_account_id = sa.id JOIN members m ON sa.member_id = m.id WHERE m.branch_id = ? AND DATE(st.date) = ?
           ) + (
             SELECT COUNT(*) FROM expenses WHERE branch_id = ? AND DATE(date) = ?
           ) + (
             SELECT COUNT(*) FROM loans WHERE branch_id = ? AND DATE(COALESCE(disbursement_date, start_date)) = ?
           ) as activity_count`,
          [b.id, dStr, b.id, dStr, b.id, dStr, b.id, dStr]
        );

        const [dcbRow] = await pool.query(
          "SELECT id, status FROM daily_cash_balances WHERE branch_id = ? AND date = ?",
          [b.id, dStr]
        );

        if (activity_count > 0 || dcbRow.length > 0 || dStr === '2026-06-23' || dStr === '2026-06-24') {
          const status = (dcbRow.length > 0) ? dcbRow[0].status : 'closed';
          
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

      // Update branch wallet balance
      console.log(`Setting Branch ${b.branch_name} wallet_balance to ${prevClosing}`);
      await pool.query("UPDATE branches SET wallet_balance = ? WHERE id = ?", [prevClosing, b.id]);
    }

    console.log("\nAll branches corrected and recalculated successfully!");
  } catch (err) {
    console.error("Error doing cleanup:", err);
  } finally {
    await pool.end();
  }
}

main();
