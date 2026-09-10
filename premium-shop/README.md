# Premium Dukan

Angular 17 storefront and Node HTTP/Mongoose API. The September 2026 implementation brief is implemented in the existing Downloads checkout. No catalog data is seeded from the mockups.

## Run locally

Use Node.js 22 (tested with 22.12.0). Install dependencies with npm ci in both frontend and backend.

1. Configure the backend environment using backend/.env.example as the reference. All values in the example are placeholders.
2. Run a local MongoDB instance or supply a dedicated development MONGO_URI. Do not use live inventory for testing.
3. From backend, run node --env-file=.env server.js if you have created a local .env; otherwise export the variables and run npm start. The default port is 3000.
4. From frontend, run npm run start:local. It uses /api through the existing localhost:3000 proxy.

npm start and npm run start:hosted use the hosted backend and its existing admin login. npm run start:local explicitly uses the local backend. New banner and upload endpoints will not be available on that host until a separately authorized backend deployment. Production API configuration remains in frontend/src/environment/environment.ts.

## Required server environment

| Variable | Purpose |
| --- | --- |
| MONGO_URI | MongoDB connection; defaults to local premiumshop database |
| ADMIN_EMAIL | Existing admin email |
| ADMIN_PASSWORD_HASH | Bcrypt hash of the admin password; never a plaintext password |
| JWT_SECRET | Strong private signing secret; required in production |
| CLOUDINARY_CLOUD_NAME | Cloudinary cloud name |
| CLOUDINARY_API_KEY | Server-side Cloudinary API key |
| CLOUDINARY_API_SECRET | Server-side Cloudinary API secret |
| UPLOAD_MAX_BYTES | Optional upload byte limit; defaults to 2097152 (2 MB), capped at 10 MB |
| PORT | Optional port; defaults to 3000 |
| NODE_ENV | Set to production on a production server |

No Cloudinary upload credentials belong in Angular, source control, or logs. If upload credentials are missing, the protected endpoint returns an actionable 503; the paste-image-URL option remains usable. The admin image input obtains the configured byte limit from the protected configuration endpoint.

## Storefront

- Coral accents and shared day/night styling. The first visit defaults to Light; a manual Dark/Light choice is remembered locally. The existing inline theme initializer prevents a light flash.
- Search stays next to the theme switch. Brand and banners scroll away. IntersectionObserver changes the single category navigation into a fixed compact strip; a measured placeholder preserves its document space. Search remains sticky above it.
- Actual catalog categories retain their values and labels. A small icon map covers recognized names; unknown categories keep their name and a generic sticker. No automatic reclassification.
- Search, category, price range, optional duration and in-stock-only filters combine. All clears only category; Reset filters clears all controls. Default ordering preserves the API order, price sorts use actual prices, and Newest uses createdAt with deterministic ties.
- Compact horizontal cards show the existing dollar prices, actual stock and optional plan/duration. WhatsApp checkout uses the existing number and encoded message. Stock at or below zero disables Buy.
- Banner requests run independently from product requests. Only active banners appear publicly. The carousel uses native touch scrolling, dots and keyboard controls, with no automatic rotation. Zero banners hides the section; one banner has no carousel controls.

## Admin workflows

Products remain at /admin with the existing guarded editor routes. /admin/banners provides creation, editing, replacement artwork, active/inactive toggles, display order and confirmed record deletion.

Both editors share Upload image and Paste image URL. File selection previews locally without changing the saved record. Upload progress, failures and pending selections disable saving until resolved. Successful upload metadata is applied to the draft, then persisted only when Save succeeds. Failed saves retain the draft for retry and report that a new upload may remain unlinked. No code automatically destroys Cloudinary images, including on record deletion.

Banner destinations accept /product/OBJECT_ID, /category/URL_ENCODED_CATEGORY, /?category=URL_ENCODED_CATEGORY or an external HTTPS URL. Protocol-relative URLs, unsafe schemes, embedded credentials and unrelated internal admin routes are rejected. Product images accept complete HTTP/HTTPS URLs for compatibility; the server never fetches these URLs during validation.

## API additions

| Endpoint | Access and behavior |
| --- | --- |
| GET /api/banners | Public active banners only, sorted by sortOrder/createdAt/id; excludes internal title and managed public ID |
| GET /api/admin/banners | Admin-only list including inactive records |
| POST /api/admin/banners | Admin-only validated creation; inactive by default |
| PUT /api/admin/banners/:id | Admin-only validated partial update |
| DELETE /api/admin/banners/:id | Admin-only record deletion; hosted image retained |
| GET /api/admin/uploads/config | Admin-only configured byte limit |
| POST /api/uploads | Admin-only multipart: one image file and one purpose field (product or banner) |

Uploads use Busboy with bounded file/field counts, byte limits and timeouts. Signature checks and Sharp decoding enforce genuine, non-animated JPEG, PNG or WebP content and a 40-million-pixel ceiling. Cloudinary receives a buffer through upload_stream, using unique IDs and separate premium-dukan/products and premium-dukan/banners folders. The response contains secureUrl, publicId, width, height and format. MongoDB stores URLs/metadata, never base64 image payloads.

## Additive schema guidance

Existing products keep their IDs, names, descriptions, categories, prices, imageUrl and stock. Optional additions are imagePublicId, imageWidth, imageHeight, planLabel and durationMonths (positive whole months; null/missing is valid). No bulk migration or rewrite of existing products is required.

A new banners collection has title, imageUrl, optional managed image metadata, altText, targetUrl, sortOrder, isActive and timestamps. The model declares an index on isActive/sortOrder/createdAt. Existing product updatedAt/category indexes remain. If production disables automatic index creation, create these indexes explicitly through the normal database deployment process. No database migrations or live inventory changes were run here.

## Performance and checks

Compiled local Tailwind, lazy admin/detail routes, responsive Cloudinary delivery and safe image fallbacks remain. There are no serial image queues. Product and banner public reads deduplicate requests and cache for 30 seconds in memory; mutations invalidate the relevant cache. Admin list reads always fetch fresh data. Other sessions' edits can take up to 30 seconds to appear on a later storefront visit. No polling is added.

- Frontend: npm test; npm run typecheck; npm run build.
- Backend: npm test. External upload/database behavior is mocked; generated tiny images test content validation.
- Production output: frontend/dist/premium-shop. Do not check generated output or dependencies into Git. Configure SPA fallback, compression and long-lived caching for hashed JS/CSS when deployment is separately approved.

Implementation details and verification limitations are in IMPLEMENTATION-REPORT.md. Reference documentation: https://cloudinary.com/documentation/node_image_and_video_upload, https://github.com/mscdex/busboy, https://sharp.pixelplumbing.com/api-constructor/.
