const http = require('http');
const fs = require('fs');

const envFile = fs.readFileSync('S:/SnookerSaaS/webapp/.env', 'utf8');
const token = envFile.split('\n').find(line => line.startsWith('VITE_DEV_TOKEN=')).split('=')[1].trim();

const payload = JSON.stringify({
  items: [{ inventoryItemId: 'a632e8fb-2485-4bc5-aeff-8b3fc675bb2b', quantity: 1 }],
  paymentMethod: 'CASH',
  playerId: '071a5c37-887e-40e1-bbd4-cddbb43bed6b'
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/inventory/order',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('RESPONSE:', res.statusCode, body));
});

req.on('error', e => console.error('ERROR:', e.message));
req.write(payload);
req.end();
