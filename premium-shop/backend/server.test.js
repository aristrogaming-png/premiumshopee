const { test, before, after, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { server, Product, Banner } = require("./server");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");
const media = require("./media");
const {
  RequestError,
  productInput,
  bannerInput,
  targetUrl,
} = require("./validation");

let base;
let ready = 1;
Object.defineProperty(mongoose.connection, "readyState", {
  configurable: true,
  get: () => ready,
});
const id = new mongoose.Types.ObjectId();
const product = {
  _id: id,
  __v: 0,
  name: "Plan",
  price: 10,
  category: "Tools",
  stock: 3,
};

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
});
afterEach(() => {
  mock.restoreAll();
  ready = 1;
});

test("catalog uses lean reads, bounded queries and preserves public IDs", async () => {
  mock.method(Product, "find", (filter) => {
    assert.deepEqual(filter, {});
    return {
      sort(value) {
        assert.deepEqual(value, { updatedAt: -1 });
        return this;
      },
      lean() {
        return this;
      },
      maxTimeMS(value) {
        assert.equal(value, 5000);
        return Promise.resolve([product]);
      },
    };
  });
  const res = await fetch(`${base}/api/products`);
  assert.equal(res.status, 200);
  const [item] = await res.json();
  assert.equal(item.id, id.toString());
  assert.equal(item.stock, 3);
  assert.equal("_id" in item, false);
  assert.equal("__v" in item, false);
});

test("search treats regex punctuation as literal text", async () => {
  mock.method(Product, "find", (filter) => {
    assert.equal(filter.$or[0].name.test("a+b [plan]"), true);
    assert.equal(filter.$or[0].name.test("aaab p"), false);
    return {
      sort() {
        return this;
      },
      lean() {
        return this;
      },
      maxTimeMS() {
        return Promise.resolve([]);
      },
    };
  });
  const res = await fetch(
    `${base}/api/products?search=${encodeURIComponent("a+b [plan]")}`,
  );
  assert.equal(res.status, 200);
});

test("catalog keeps recently updated items first within available and sold-out groups", async () => {
  const rows = [
    { ...product, name: "new sold out", stock: 0 },
    { ...product, name: "new available", stock: 2 },
    { ...product, name: "old sold out", stock: -1 },
    { ...product, name: "old available", stock: 1 },
  ];
  mock.method(Product, "find", () => ({
    sort(value) {
      assert.deepEqual(value, { updatedAt: -1 });
      return this;
    },
    lean() {
      return this;
    },
    maxTimeMS() {
      return Promise.resolve(rows);
    },
  }));
  const res = await fetch(`${base}/api/products`);
  assert.deepEqual(
    (await res.json()).map((item) => item.name),
    ["new available", "old available", "new sold out", "old sold out"],
  );
});

test("database unavailability returns an immediate retryable response", async () => {
  ready = 0;
  const res = await fetch(`${base}/api/products`);
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("retry-after"), "5");
});

test("detail query failure is handled without terminating the server", async () => {
  mock.method(Product, "findById", () => ({
    lean() {
      return this;
    },
    maxTimeMS() {
      return Promise.reject(new Error("offline"));
    },
  }));
  const res = await fetch(`${base}/api/products/${id}`);
  assert.equal(res.status, 503);
  assert.equal((await fetch(`${base}/unknown`)).status, 404);
});

test("invalid detail IDs and unauthorized mutations remain rejected", async () => {
  assert.equal((await fetch(`${base}/api/products/invalid`)).status, 400);
  assert.equal(
    (await fetch(`${base}/api/products/${id}`, { method: "DELETE" })).status,
    401,
  );
  assert.equal(
    (await fetch(`${base}/api/products`, { method: "POST" })).status,
    401,
  );
});

const adminHeaders = () => ({
  Authorization: `Bearer ${jwt.sign({ role: "admin" }, process.env.JWT_SECRET || "dev_secret_change_me", { expiresIn: "1m" })}`,
});
const jsonHeaders = () => ({
  ...adminHeaders(),
  "Content-Type": "application/json",
});

test("banner and upload operations require an admin, including reads of inactive banners", async () => {
  for (const [method, path] of [
    ["GET", "/api/admin/banners"],
    ["POST", "/api/admin/banners"],
    ["PUT", `/api/admin/banners/${id}`],
    ["DELETE", `/api/admin/banners/${id}`],
    ["POST", "/api/uploads"],
    ["GET", "/api/admin/uploads/config"],
  ]) {
    assert.equal((await fetch(base + path, { method })).status, 401);
    const expired = jwt.sign(
      { role: "admin", exp: 1 },
      process.env.JWT_SECRET || "dev_secret_change_me",
    );
    assert.equal(
      (
        await fetch(base + path, {
          method,
          headers: { Authorization: `Bearer ${expired}` },
        })
      ).status,
      401,
    );
    const customer = jwt.sign(
      { role: "customer" },
      process.env.JWT_SECRET || "dev_secret_change_me",
    );
    assert.equal(
      (
        await fetch(base + path, {
          method,
          headers: { Authorization: `Bearer ${customer}` },
        })
      ).status,
      403,
    );
  }
});

test("banner CRUD preserves public visibility, ordering and media without destroying assets", async () => {
  const rows = [];
  mock.method(Banner, "create", async (body) => {
    const row = {
      ...body,
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
    };
    rows.push(row);
    return { ...row, id: row._id.toString() };
  });
  mock.method(Banner, "find", (filter) => ({
    sort(order) {
      assert.deepEqual(order, { sortOrder: 1, createdAt: 1, _id: 1 });
      return this;
    },
    lean() {
      return this;
    },
    maxTimeMS() {
      return Promise.resolve(
        rows
          .filter((row) => filter.isActive === undefined || row.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
    },
  }));
  mock.method(Banner, "findByIdAndUpdate", async (bannerId, updates) => {
    const row = rows.find((row) => row._id.toString() === bannerId);
    if (row) Object.assign(row, updates);
    return row;
  });
  mock.method(Banner, "findByIdAndDelete", async (bannerId) => {
    const index = rows.findIndex((row) => row._id.toString() === bannerId);
    return index < 0 ? null : rows.splice(index, 1)[0];
  });
  const create = async (title, sortOrder) => {
    const res = await fetch(`${base}/api/admin/banners`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        title,
        altText: title,
        imageUrl: "https://example.com/image.png",
        targetUrl: "/?category=Music",
        sortOrder,
      }),
    });
    assert.equal(res.status, 201);
    return res.json();
  };
  const second = await create("second", 2);
  const first = await create("first", 1);
  assert.deepEqual(
    await (await fetch(`${base}/api/banners?includeInactive=true`)).json(),
    [],
  );
  assert.equal(
    (
      await (
        await fetch(`${base}/api/admin/banners`, { headers: adminHeaders() })
      ).json()
    ).length,
    2,
  );
  for (const banner of [second, first])
    assert.equal(
      (
        await fetch(`${base}/api/admin/banners/${banner.id}`, {
          method: "PUT",
          headers: jsonHeaders(),
          body: JSON.stringify({ isActive: true }),
        })
      ).status,
      200,
    );
  const active = await (await fetch(`${base}/api/banners`)).json();
  assert.deepEqual(
    active.map((banner) => banner.altText),
    ["first", "second"],
  );
  for (const banner of active) {
    assert.equal("title" in banner, false);
    assert.equal("imagePublicId" in banner, false);
    assert.equal("isActive" in banner, false);
  }
  assert.equal(
    (
      await fetch(`${base}/api/admin/banners/${first.id}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ imageUrl: "javascript:alert(1)" }),
      })
    ).status,
    400,
  );
  assert.equal(rows[1].imageUrl, "https://example.com/image.png");
  assert.equal(
    (
      await fetch(`${base}/api/admin/banners/${first.id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      })
    ).status,
    200,
  );
  assert.equal(rows.length, 1);
});

test("record validation rejects unsafe URLs, invalid numbers and Mongo update operators", () => {
  for (const value of [
    "javascript:alert(1)",
    "//evil.example",
    "http://evil.example",
    "/admin",
    "/\\evil.example",
    "https://user:pass@example.com",
  ])
    assert.throws(() => targetUrl(value));
  for (const value of [
    "/?category=AI%20Tools",
    "/category/AI%20Tools",
    `/product/${id}`,
    "https://example.com/offer",
  ])
    assert.equal(targetUrl(value), value);
  assert.throws(() => productInput({ name: "x", category: "y", price: -1 }));
  assert.throws(() => productInput({ $set: { stock: 1 } }, true));
  assert.throws(() => productInput({ stock: 1.5 }, true));
  assert.throws(() =>
    productInput({ imageUrl: "data:image/png;base64,x" }, true),
  );
  assert.throws(() => productInput({ durationMonths: 0 }, true));
  assert.equal(productInput({ name: "x", category: "y", price: 10 }).price, 10);
  assert.deepEqual(
    productInput({ planLabel: "Annual", durationMonths: 12 }, true),
    { planLabel: "Annual", durationMonths: 12 },
  );
  assert.throws(() =>
    bannerInput({
      title: "x",
      altText: "x",
      imageUrl: "https://example.com/x.png",
      targetUrl: "/",
      isActive: "true",
    }),
  );
});

async function multipart(
  buffer,
  mime = "image/png",
  purpose = "product",
  extraFile = false,
) {
  const body = new FormData();
  body.append("purpose", purpose);
  body.append("image", new Blob([buffer], { type: mime }), "image.png");
  if (extraFile)
    body.append("image", new Blob([buffer], { type: mime }), "second.png");
  return fetch(`${base}/api/uploads`, {
    method: "POST",
    headers: adminHeaders(),
    body,
  });
}

test("genuine uploads return metadata and never send frontend-selected URLs to Cloudinary", async () => {
  let calls = 0;
  mock.method(media, "uploadImage", async (buffer, purpose) => {
    calls++;
    assert.ok(buffer.length);
    assert.equal(purpose, "product");
    return {
      secureUrl: "https://res.cloudinary.com/test/image/upload/v1/test.png",
      publicId: "premium-dukan/products/test",
      width: 2,
      height: 2,
      format: "png",
    };
  });
  for (const format of ["png", "jpeg", "webp"]) {
    const buffer = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "#fa625f" },
    })
      .toFormat(format)
      .toBuffer();
    const res = await multipart(buffer, `image/${format}`);
    assert.equal(res.status, 201);
    assert.equal((await res.json()).publicId, "premium-dukan/products/test");
  }
  assert.equal(calls, 3);
});

test("spoofed, malformed, oversized, multiple-file and invalid-purpose uploads are rejected", async () => {
  const upload = mock.method(media, "uploadImage", async () => {
    throw Error("must not upload");
  });
  const png = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  for (const request of [
    () =>
      multipart(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
    () => multipart(png, "image/jpeg"),
    () => multipart(png.subarray(0, 16)),
    () => multipart(png, "image/png", "avatar"),
    () => multipart(png, "image/png", "banner", true),
    () =>
      fetch(`${base}/api/uploads`, {
        method: "POST",
        headers: {
          ...adminHeaders(),
          "Content-Type": "multipart/form-data; boundary=bad",
        },
        body: "not multipart",
      }),
  ])
    assert.equal((await request()).status, 400);
  assert.equal((await multipart(Buffer.alloc(media.maxBytes + 1))).status, 413);
  assert.equal(upload.mock.callCount(), 0);
});

test("Cloudinary failure reports a retryable error without modifying records", async () => {
  const create = mock.method(Product, "create", () => {
    throw Error("must not save");
  });
  mock.method(media, "uploadImage", async () => {
    throw new RequestError("Image upload failed. Please retry.", 502);
  });
  const png = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  const res = await multipart(png);
  assert.equal(res.status, 502);
  assert.match((await res.json()).message, /retry/);
  assert.equal(create.mock.callCount(), 0);
});

test("failed product saves keep uploaded assets and return an actionable error", async () => {
  mock.method(Product, "findByIdAndUpdate", async () => {
    throw Error("database failure");
  });
  const res = await fetch(`${base}/api/products/${id}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({
      imageUrl: "https://example.com/new.png",
      imagePublicId: "premium-dukan/products/new",
    }),
  });
  assert.equal(res.status, 500);
  assert.match(
    (await res.json()).message,
    /Uploaded images have not been deleted/,
  );
});
