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

    for (const b of branches) {
      const branchId = b.id;
      console.log(`\n========================================`);
      console.log(`Processing Branch: ${b.branch_name} (ID: ${branchId})`);
      console.log(`========================================`);

      // Find the first date of any activity or daily cash balance for this branch
      const [firstDateRows] = await pool.query(`
        SELECT MIN(activity_date) as min_date FROM (
          SELECT MIN(DATE(payment_date)) AS activity_date FROM collections WHERE branch_id = ? UNION
          SELECT MIN(DATE(start_date)) AS activity_date FROM loans WHERE branch_id = ? UNION
          SELECT MIN(DATE(date)) AS activity_date FROM expenses WHERE branch_id = ? UNION
          SELECT MIN(DATE(st.date)) AS activity_date FROM savings_transactions st JOIN savings_accounts sa ON st.savings_account_id = sa.id JOIN members m ON sa.member_id = m.id WHERE m.branch_id = ? UNION
          SELECT MIN(DATE(payment_date)) AS activity_date FROM salaries WHERE branch_id = ? UNION
          SELECT MIN(DATE(date)) AS activity_date FROM daily_cash_balances WHERE branch_id = ?
        ) as t WHERE activity_date IS NOT NULL
      `, [branchId, branchId, branchId, branchId, branchId, branchId]);

      let startDateStr = '2026-05-30';
      if (firstDateRows[0] && firstDateRows[0].min_date) {
        const dbMinDate = new Date(firstDateRows[0].min_date);
        // Format to YYYY-MM-DD
        const formattedMin = dbMinDate.toISOString().split('T')[0];
        console.log(`Earliest detected activity date: ${formattedMin}`);
        if (formattedMin < startDateStr) {
          startDateStr = formattedMin;
        }
      } else {
        console.log(`No activities found. Defaulting start date to ${startDateStr}`);
      }

      console.log(`Starting sequential close from ${startDateStr} to 2026-06-21`);

      let currentDate = new Date(startDateStr);
      const endDate = new Date('2026-06-21');

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        console.log(`  Processing Date: ${dateStr}`);

        // 1. Calculate opening balance
        const [opResult] = await pool.query(
          `SELECT COALESCE(
            (SELECT opening_balance FROM daily_cash_balances WHERE branch_id = ? AND DATE(date) = ? AND status = 'closed'),
            (SELECT closing_balance FROM daily_cash_balances WHERE branch_id = ? AND DATE(date) < ? ORDER BY date DESC LIMIT 1),
            0
          ) as opening_balance`,
          [branchId, dateStr, branchId, dateStr]
        );
        const opening_balance = parseFloat(opResult[0]?.opening_balance || 0);

        // 2. Calculate Inflows (utilizing correct column names from actual tables)
        const [[{ col_amt }]] = await pool.query(`SELECT COALESCE(SUM(amount_paid), 0) as col_amt FROM collections WHERE branch_id = ? AND DATE(payment_date) = ? AND status = 'approved'`, [branchId, dateStr]);
        const [[{ sav_dep }]] = await pool.query(`SELECT COALESCE(SUM(st.amount), 0) as sav_dep FROM savings_transactions st JOIN savings_accounts sa ON st.savings_account_id = sa.id JOIN members m ON sa.member_id = m.id WHERE m.branch_id = ? AND DATE(st.date) = ? AND st.type = 'deposit'`, [branchId, dateStr]);
        const [[{ sale_amt }]] = await pool.query(`SELECT COALESCE(SUM(s.total_amount), 0) as sale_amt FROM sales s JOIN members m ON s.member_id = m.id WHERE m.branch_id = ? AND DATE(s.sale_date) = ?`, [branchId, dateStr]);
        const [[{ bank_with }]] = await pool.query(`SELECT COALESCE(SUM(amount), 0) as bank_with FROM bank_transactions WHERE type = 'withdrawal' AND source_type = 'branch' AND source_id = ? AND DATE(date) = ?`, [branchId, dateStr]);
        
        const total_inflow = parseFloat(col_amt || 0) + parseFloat(sav_dep || 0) + parseFloat(sale_amt || 0) + parseFloat(bank_with || 0);

        // 3. Calculate Outflows
        const [[{ disb_amt }]] = await pool.query(`SELECT COALESCE(SUM(amount), 0) as disb_amt FROM loans WHERE branch_id = ? AND DATE(COALESCE(disbursement_date, start_date)) = ? AND status IN ('active', 'closed')`, [branchId, dateStr]);
        const [[{ sal_amt }]] = await pool.query(`SELECT COALESCE(SUM(net_salary), 0) as sal_amt FROM salaries WHERE branch_id = ? AND DATE(payment_date) = ?`, [branchId, dateStr]);
        const [[{ exp_amt }]] = await pool.query(`SELECT COALESCE(SUM(amount), 0) as exp_amt FROM expenses WHERE branch_id = ? AND DATE(date) = ?`, [branchId, dateStr]);
        const [[{ sav_with }]] = await pool.query(`SELECT COALESCE(SUM(st.amount), 0) as sav_with FROM savings_transactions st JOIN savings_accounts sa ON st.savings_account_id = sa.id JOIN members m ON sa.member_id = m.id WHERE m.branch_id = ? AND DATE(st.date) = ? AND st.type = 'withdrawal'`, [branchId, dateStr]);
        const [[{ bank_dep }]] = await pool.query(`SELECT COALESCE(SUM(amount), 0) as bank_dep FROM bank_transactions WHERE type = 'deposit' AND source_type = 'branch' AND source_id = ? AND DATE(date) = ?`, [branchId, dateStr]);

        const total_outflow = parseFloat(disb_amt || 0) + parseFloat(sal_amt || 0) + parseFloat(exp_amt || 0) + parseFloat(sav_with || 0) + parseFloat(bank_dep || 0);

        const closing_balance = opening_balance + total_inflow - total_outflow;

        console.log(`    Opening Balance: ${opening_balance}`);
        console.log(`    Total Inflow:    ${total_inflow} (collections: ${col_amt}, savings_deposit: ${sav_dep}, sale_amount: ${sale_amt}, bank_withdrawal: ${bank_with})`);
        console.log(`    Total Outflow:   ${total_outflow} (disbursement: ${disb_amt}, salary: ${sal_amt}, expenses: ${exp_amt}, savings_withdraw: ${sav_with}, bank_deposit: ${bank_dep})`);
        console.log(`    Closing Balance: ${closing_balance}`);

        // Insert or update daily_cash_balances with status = 'closed'
        const [insResult] = await pool.query(
          `INSERT INTO daily_cash_balances (branch_id, date, opening_balance, total_inflow, total_outflow, closing_balance, status)
           VALUES (?, ?, ?, ?, ?, ?, 'closed')
           ON DUPLICATE KEY UPDATE 
           opening_balance = VALUES(opening_balance),
           total_inflow = VALUES(total_inflow),
           total_outflow = VALUES(total_outflow),
           closing_balance = VALUES(closing_balance),
           status = 'closed'`,
           [branchId, dateStr, opening_balance, total_inflow, total_outflow, closing_balance]
        );
        console.log(`    => Database Status: Row Inserted/Updated successfully`);

        // Move to the next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    console.log("\nAll past days closed successfully!");
  } catch (err) {
    console.error("Error running close_past_days script:", err);
  } finally {
    await pool.end();
  }
}

main();
