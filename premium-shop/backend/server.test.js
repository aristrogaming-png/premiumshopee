const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { server, Product } = require('./server');

let base;
let ready = 1;
Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => ready });
const id = new mongoose.Types.ObjectId();
const product = { _id: id, __v: 0, name: 'Plan', price: 10, category: 'Tools', stock: 3 };

before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
afterEach(() => { mock.restoreAll(); ready = 1; });

test('catalog uses lean reads, bounded queries and preserves public IDs', async () => {
  mock.method(Product, 'find', filter => {
    assert.deepEqual(filter, {});
    return {
      sort(value) { assert.deepEqual(value, { updatedAt: -1 }); return this; },
      lean() { return this; },
      maxTimeMS(value) { assert.equal(value, 5000); return Promise.resolve([product]); }
    };
  });
  const res = await fetch(`${base}/api/products`);
  assert.equal(res.status, 200);
  const [item] = await res.json();
  assert.equal(item.id, id.toString());
  assert.equal(item.stock, 3);
  assert.equal('_id' in item, false);
  assert.equal('__v' in item, false);
});

test('search treats regex punctuation as literal text', async () => {
  mock.method(Product, 'find', filter => {
    assert.equal(filter.$or[0].name.test('a+b [plan]'), true);
    assert.equal(filter.$or[0].name.test('aaab p'), false);
    return { sort() { return this; }, lean() { return this; }, maxTimeMS() { return Promise.resolve([]); } };
  });
  const res = await fetch(`${base}/api/products?search=${encodeURIComponent('a+b [plan]')}`);
  assert.equal(res.status, 200);
});

test('catalog keeps recently updated items first within available and sold-out groups', async () => {
  const rows = [
    { ...product, name: 'new sold out', stock: 0 },
    { ...product, name: 'new available', stock: 2 },
    { ...product, name: 'old sold out', stock: -1 },
    { ...product, name: 'old available', stock: 1 }
  ];
  mock.method(Product, 'find', () => ({
    sort(value) { assert.deepEqual(value, { updatedAt: -1 }); return this; },
    lean() { return this; },
    maxTimeMS() { return Promise.resolve(rows); }
  }));
  const res = await fetch(`${base}/api/products`);
  assert.deepEqual((await res.json()).map(item => item.name),
    ['new available', 'old available', 'new sold out', 'old sold out']);
});

test('database unavailability returns an immediate retryable response', async () => {
  ready = 0;
  const res = await fetch(`${base}/api/products`);
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('retry-after'), '5');
});

test('detail query failure is handled without terminating the server', async () => {
  mock.method(Product, 'findById', () => ({ lean() { return this; }, maxTimeMS() { return Promise.reject(new Error('offline')); } }));
  const res = await fetch(`${base}/api/products/${id}`);
  assert.equal(res.status, 503);
  assert.equal((await fetch(`${base}/unknown`)).status, 404);
});

test('invalid detail IDs and unauthorized mutations remain rejected', async () => {
  assert.equal((await fetch(`${base}/api/products/invalid`)).status, 400);
  assert.equal((await fetch(`${base}/api/products/${id}`, { method: 'DELETE' })).status, 401);
  assert.equal((await fetch(`${base}/api/products`, { method: 'POST' })).status, 401);
});
