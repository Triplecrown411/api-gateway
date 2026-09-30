const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(express.json());
const customers = {};
const ledger = [];
app.post('/create-customer', (req, res) => {
  const { email } = req.body;
  const rawKey = 'sk_' + uuidv4().replace(/-/g, '');
  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
  const customerId = uuidv4();
  customers[hashedKey] = { customerId, email, active: true };
  res.json({ apiKey: rawKey, customerId, email });
});
function validateKey(req, res, next) {
  const rawKey = req.headers['x-api-key'];
  if (rawKey === undefined || rawKey === null || rawKey === '') return res.status(401).json({ error: 'No API key' });
  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
  const customer = customers[hashedKey];
  if (customer === undefined || customer.active === false) return res.status(403).json({ error: 'Invalid key' });
  req.customer = customer;
  next();
}
app.post('/api/query', validateKey, (req, res) => {
  const { prompt } = req.body;
  const inputTokens = prompt.split(' ').length;
  const outputTokens = 50;
  const cost = ((inputTokens + outputTokens) / 1000) * 0.002;
  ledger.push({ customerId: req.customer.customerId, email: req.customer.email, inputTokens, outputTokens, cost: cost.toFixed(6), timestamp: new Date().toISOString() });
  res.json({ response: 'Your API gateway is live', usage: { inputTokens, outputTokens, cost } });
});
app.get('/ledger', (req, res) => res.json(ledger));
app.get('/customers', (req, res) => res.json(Object.values(customers)));
app.listen(3000, () => console.log('Gateway running on port 3000'));
