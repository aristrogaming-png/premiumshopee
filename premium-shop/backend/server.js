const http = require('http');
const url = require('url');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/* =====================
   CONFIG
===================== */
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/premiumshop';

// Admin credentials (secure)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@premiumshop.com';
// Store HASH only (NOT plain password)
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/* =====================
   MONGOOSE SETUP
===================== */
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    description: { type: String, default: '' },
    stock: { type: Number, default: 0 }
  },
  { timestamps: true, bufferCommands: false }
);

productSchema.index({ updatedAt: -1 });
productSchema.index({ category: 1, updatedAt: -1 });

// ✅ Make Mongo return `id` instead of `_id` (Angular expects `id`)
productSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Product = mongoose.model('Product', productSchema);

/* =====================
   HELPERS
===================== */
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function publicProduct(product) {
  const { _id, __v, ...fields } = product;
  return { ...fields, id: _id.toString() };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function handleCors(req, res) {
  // In production, replace "*" with your frontend domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function getIdFromPath(pathname) {
  const parts = pathname.split('/');
  return parts[parts.length - 1];
}

function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function requireAdmin(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    json(res, 401, { message: 'Unauthorized (no token)' });
    return false;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      json(res, 403, { message: 'Forbidden' });
      return false;
    }
    return true;
  } catch {
    json(res, 401, { message: 'Unauthorized (invalid token)' });
    return false;
  }
}

/* =====================
   SERVER
===================== */
const server = http.createServer(async (req, res) => {
  if (handleCors(req, res)) return;

  const { pathname, query } = url.parse(req.url, true);

  /* ========= AUTH ========= */
  if (pathname === '/api/login' && req.method === 'POST') {
    try {
      const { email, password } = await parseBody(req);

      // Basic checks
      if (!email || !password) {
        return json(res, 400, { success: false, message: 'Email and password required' });
      }

      // Ensure env is set
      if (!ADMIN_PASSWORD_HASH) {
        return json(res, 500, {
          success: false,
          message: 'Server misconfigured: ADMIN_PASSWORD_HASH not set'
        });
      }

      // Verify email
      if (email !== ADMIN_EMAIL) {
        return json(res, 401, { success: false, message: 'Invalid credentials' });
      }

      // Verify password hash
      const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
      if (!ok) {
        return json(res, 401, { success: false, message: 'Invalid credentials' });
      }

      // Create token
      const token = jwt.sign({ role: 'admin', email }, JWT_SECRET, { expiresIn: '2h' });

      return json(res, 200, { success: true, token });
    } catch (err) {
      return json(res, 400, { success: false, message: 'Invalid request' });
    }
  }

  /* ========= PRODUCTS ========= */

  if (pathname.startsWith('/api/products') && mongoose.connection.readyState !== 1) {
    res.setHeader('Retry-After', '5');
    return json(res, 503, { message: 'Product service is temporarily unavailable. Please retry.' });
  }

  // GET ALL (public)
  if (pathname === '/api/products' && req.method === 'GET') {
    try {
      const filter = {};

      if (typeof query.category === 'string' && query.category) filter.category = query.category;
      if (typeof query.search === 'string' && query.search) {
        const search = new RegExp(escapeRegex(query.search.slice(0, 200)), 'i');
        filter.$or = [
          { name: search },
          { description: search }
        ];
      }

      const products = await Product.find(filter).sort({ updatedAt: -1 }).lean().maxTimeMS(5000);

      // Preserve recently updated ordering within the in-stock and sold-out groups.
      const available = [];
      const soldOut = [];
      for (const product of products) {
        (product.stock <= 0 ? soldOut : available).push(publicProduct(product));
      }
      return json(res, 200, available.concat(soldOut));
    } catch (err) {
      return json(res, 500, { message: 'Server error', error: err.message });
    }
  }

  // GET BY ID (public)
  if (pathname.startsWith('/api/products/') && req.method === 'GET') {
    const id = getIdFromPath(pathname);

    if (!mongoose.isValidObjectId(id)) {
      return json(res, 400, { message: 'Invalid product id' });
    }

    try {
      const product = await Product.findById(id).lean().maxTimeMS(5000);
      if (!product) return json(res, 404, { message: 'Not found' });
      return json(res, 200, publicProduct(product));
    } catch {
      return json(res, 503, { message: 'Unable to load product. Please retry.' });
    }
  }

  // CREATE (admin only)
  if (pathname === '/api/products' && req.method === 'POST') {
    if (!requireAdmin(req, res)) return;

    try {
      const body = await parseBody(req);

      if (!body.name || body.price === undefined || !body.category) {
        return json(res, 400, { message: 'Missing required fields' });
      }

      const product = await Product.create({
        name: body.name,
        price: Number(body.price),
        category: body.category,
        imageUrl: body.imageUrl || '',
        description: body.description || '',
        stock: Number(body.stock || 0)
      });

      return json(res, 201, product);
    } catch (err) {
      return json(res, 400, { message: 'Invalid data', error: err.message });
    }
  }

  // UPDATE (admin only)
  if (pathname.startsWith('/api/products/') && req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;

    const id = getIdFromPath(pathname);
    if (!mongoose.isValidObjectId(id)) {
      return json(res, 400, { message: 'Invalid product id' });
    }

    try {
      const updates = await parseBody(req);

      if (updates.price !== undefined) updates.price = Number(updates.price);
      if (updates.stock !== undefined) updates.stock = Number(updates.stock);

      const updated = await Product.findByIdAndUpdate(id, updates, { new: true });
      if (!updated) return json(res, 404, { message: 'Not found' });

      return json(res, 200, updated);
    } catch (err) {
      return json(res, 400, { message: 'Invalid update', error: err.message });
    }
  }

  // DELETE (admin only)
  if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;

    const id = getIdFromPath(pathname);
    if (!mongoose.isValidObjectId(id)) {
      return json(res, 400, { message: 'Invalid product id' });
    }

    try {
      const deleted = await Product.findByIdAndDelete(id);
      if (!deleted) return json(res, 404, { message: 'Not found' });
      return json(res, 200, { success: true });
    } catch {
      return json(res, 503, { message: 'Unable to delete product. Please retry.' });
    }
  }

  /* ========= FALLBACK ========= */
  return json(res, 404, { message: 'Route not found' });
});

/* =====================
   START
===================== */
if (require.main === module) {
  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    })
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      process.exitCode = 1;
    });
}

module.exports = { server, Product };
