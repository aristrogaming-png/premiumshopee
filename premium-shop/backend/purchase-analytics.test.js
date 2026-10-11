const { test } = require('node:test');
const assert = require('node:assert/strict');
const { purchasePayload } = require('./purchase-analytics');
const payment = { status: 'paid', verified: true, analyticsConsent: true, clientId: '123.456', transactionId: 'order_1', currency: 'USD', total: 10, items: [{ productId: '6952c2137a2648fa67f26295', quantity: 1, unitPrice: 10 }] };
test('purchase reporting rejects enquiries, unverified payments and missing consent', () => {
  for (const change of [{status:'pending'}, {verified:false}, {analyticsConsent:false}, {clientId:'person@example.com'}, {transactionId:'person@example.com'}, {currency:'BAD'}, {total:NaN}]) assert.equal(purchasePayload({...payment,...change}), null);
});
test('confirmed purchase payload uses a stable transaction ID and excludes personal details', () => {
  const output = purchasePayload({...payment, email:'private@example.com', phone:'12345', name:'Private Customer'});
  assert.equal(output.events[0].params.transaction_id, 'order_1');
  assert.equal(output.events[0].name, 'purchase');
  assert.equal(JSON.stringify(output).includes('private@example.com'), false);
  assert.equal(JSON.stringify(output).includes('Private Customer'), false);
});
