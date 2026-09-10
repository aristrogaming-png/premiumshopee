const Busboy = require("busboy");
const sharp = require("sharp");
const { v2: cloudinary } = require("cloudinary");
const { randomUUID } = require("node:crypto");
const { RequestError } = require("./validation");

const configuredLimit = Number(process.env.UPLOAD_MAX_BYTES || 2 * 1024 * 1024);
const maxBytes =
  Number.isSafeInteger(configuredLimit) &&
  configuredLimit > 0 &&
  configuredLimit <= 10 * 1024 * 1024
    ? configuredLimit
    : 2 * 1024 * 1024;

function readMultipart(req) {
  return new Promise((resolve, reject) => {
    if (Number(req.headers["content-length"]) > maxBytes + 32768) {
      req.resume();
      return reject(new RequestError("Image exceeds the upload limit.", 413));
    }
    let parser;
    // Busboy emits partsLimit when the count is reached, not only when exceeded.
    // The third part is invalid; file/field limits still enforce exactly one of each.
    try {
      parser = Busboy({
        headers: req.headers,
        limits: {
          fileSize: maxBytes,
          files: 1,
          fields: 1,
          parts: 3,
          fieldSize: 32,
        },
      });
    } catch {
      req.resume();
      return reject(new RequestError("Expected multipart image and purpose."));
    }
    let error, purpose, file;
    let bytes = 0;
    const timer = setTimeout(() => {
      req.unpipe(parser);
      parser.destroy();
      req.resume();
      reject(new RequestError("Upload timed out.", 408));
    }, 30000);
    const fail = (message) => {
      error ||= new RequestError(message);
    };
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes + 32768) {
        error = new RequestError("Upload exceeds the request limit.", 413);
        req.unpipe(parser);
        parser.destroy();
        req.resume();
      }
    });
    parser.on("field", (name, value, info) => {
      if (
        name !== "purpose" ||
        info.valueTruncated ||
        purpose !== undefined ||
        !["product", "banner"].includes(value)
      )
        fail("Purpose must be product or banner.");
      else purpose = value;
    });
    parser.on("file", (name, stream, info) => {
      const chunks = [];
      if (name !== "image" || file) fail("Send exactly one image.");
      file = { buffer: null, mime: info.mimeType };
      stream.on("data", (chunk) => {
        if (!error) chunks.push(chunk);
      });
      stream.on("limit", () => {
        error = new RequestError("Image exceeds the upload limit.", 413);
      });
      stream.on("error", () => fail("Malformed image upload."));
      stream.on("end", () => {
        file.buffer = Buffer.concat(chunks);
      });
    });
    for (const event of ["filesLimit", "fieldsLimit", "partsLimit"])
      parser.on(event, () => fail("Send one image and one purpose only."));
    parser.on("error", () => fail("Malformed multipart upload."));
    req.on("aborted", () => {
      clearTimeout(timer);
      parser.destroy();
      reject(new RequestError("Upload interrupted."));
    });
    parser.on("close", () => {
      clearTimeout(timer);
      if (error) reject(error);
      else if (!purpose || !file?.buffer?.length)
        reject(new RequestError("Image and purpose are required."));
      else resolve({ ...file, purpose });
    });
    req.pipe(parser);
  });
}

async function validateImage(buffer, mime) {
  if (!buffer.length || buffer.length > maxBytes)
    throw new RequestError("Image exceeds the upload limit.", 413);
  const signature = buffer.subarray(0, 12);
  let format;
  if (signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff)
    format = "jpeg";
  if (
    signature
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    format = "png";
  if (
    signature.toString("ascii", 0, 4) === "RIFF" &&
    signature.toString("ascii", 8, 12) === "WEBP"
  )
    format = "webp";
  if (!format || mime !== `image/${format}`)
    throw new RequestError(
      "Only genuine JPEG, PNG and WebP images are supported.",
    );
  try {
    const image = sharp(buffer, {
      limitInputPixels: 40000000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (
      metadata.format !== format ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages || 1) > 1
    )
      throw Error();
    await image.stats();
    return metadata;
  } catch {
    throw new RequestError(
      "The image is malformed, animated, or too large in dimensions.",
    );
  }
}

async function uploadImage(buffer, purpose) {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET)
    throw new RequestError(
      "Image uploads are not configured. Use Paste image URL or contact the administrator.",
      503,
    );
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: `premium-dukan/${purpose === "banner" ? "banners" : "products"}`,
        public_id: randomUUID(),
        overwrite: false,
        timeout: 60000,
      },
      (error, result) => {
        if (error || !result?.secure_url)
          return reject(
            new RequestError(
              "Image upload failed. Please retry; your saved image has not changed.",
              502,
            ),
          );
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      },
    );
    stream.on("error", () =>
      reject(new RequestError("Image upload failed. Please retry.", 502)),
    );
    stream.end(buffer);
  });
}

module.exports = { readMultipart, validateImage, uploadImage, maxBytes };
