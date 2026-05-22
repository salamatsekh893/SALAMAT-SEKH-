import { queryWithRetry } from './server';
async function test() {
  try {
    const rows = await queryWithRetry('SELECT g.meeting_day, l.id FROM loans l LEFT JOIN members m ON l.customer_id = m.id LEFT JOIN groups g ON m.group_id = g.id limit 10', []);
    console.log(rows);
  } catch (e) { console.error(e) }
  process.exit(0);
}
test();
