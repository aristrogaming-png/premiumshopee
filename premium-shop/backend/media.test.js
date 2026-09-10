const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Writable } = require('node:stream');
const { v2: cloudinary } = require('cloudinary');
const { uploadImage } = require('./media');

function configured(t) {
  const keys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const previous = keys.map(key => process.env[key]);
  keys.forEach(key => { process.env[key] = 'test-placeholder'; });
  t.after(() => keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; }));
  t.mock.method(cloudinary, 'config', options => { assert.equal(options.secure, true); });
}

test('Cloudinary adapter streams bytes with unique IDs and purpose-specific folders', async t => {
  configured(t);
  const optionsSeen = [];
  t.mock.method(cloudinary.uploader, 'upload_stream', (options, callback) => {
    optionsSeen.push(options);
    return new Writable({ write(chunk, _encoding, done) {
      assert.equal(chunk.toString(), 'validated-image-bytes');
      callback(null, { secure_url: 'https://example.com/image.png', public_id: `${options.folder}/${options.public_id}`, width: 640, height: 320, format: 'png' }); done();
    } });
  });
  const product = await uploadImage(Buffer.from('validated-image-bytes'), 'product');
  const banner = await uploadImage(Buffer.from('validated-image-bytes'), 'banner');
  assert.match(product.publicId, /^premium-dukan\/products\//);
  assert.match(banner.publicId, /^premium-dukan\/banners\//);
  assert.notEqual(optionsSeen[0].public_id, optionsSeen[1].public_id);
  assert.equal(optionsSeen[0].overwrite, false);
  assert.equal(optionsSeen[0].timeout, 60000);
  assert.equal(product.width, 640);
});

test('Cloudinary adapter reports errors without exposing provider responses', async t => {
  configured(t);
  t.mock.method(cloudinary.uploader, 'upload_stream', (_options, callback) => new Writable({ write(_chunk, _encoding, done) {
    callback({ message: 'provider-details-not-for-client' }); done();
  } }));
  await assert.rejects(uploadImage(Buffer.from('bytes'), 'product'), error => error.status === 502 && !error.message.includes('provider-details'));
});
