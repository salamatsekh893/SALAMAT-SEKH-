const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 1, role: 'superadmin', name: 'Salamat' }, process.env.JWT_SECRET || 'rayhan123456');

fetch('http://localhost:3000/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ messages: [{ role: 'user', text: 'hi' }] })
}).then(async r => {
  console.log(r.status, r.headers.get('content-type'));
  console.log(await r.text());
}).catch(console.error);
