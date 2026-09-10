class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function text(value, field, max = 500, required = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  ) {
    throw new RequestError(`${field} is invalid.`);
  }
  return value.trim();
}

function imageUrl(value, required = false) {
  const input = text(value, "Image URL", 2048, required);
  if (!input && !required) return "";
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new RequestError("Use a complete HTTP or HTTPS image URL.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new RequestError(
      "Use a complete HTTP or HTTPS image URL without credentials.",
    );
  }
  return input;
}

function targetUrl(value) {
  const input = text(value, "Destination", 2048, true);
  if (/[\\\u0000-\u0020]/.test(input) || /%5c|%2f/i.test(input.split("?")[0]))
    throw new RequestError("Invalid destination.");
  if (input.startsWith("/") && !input.startsWith("//")) {
    const url = new URL(input, "https://internal.invalid");
    if (
      url.pathname === "/" ||
      /^\/product\/[a-f\d]{24}$/i.test(url.pathname) ||
      /^\/category\/[^/]+$/.test(url.pathname)
    )
      return input;
  } else {
    try {
      const url = new URL(input);
      if (url.protocol === "https:" && !url.username && !url.password)
        return input;
    } catch {}
  }
  throw new RequestError(
    "Use an internal product/category path or an external HTTPS URL.",
  );
}

function number(value, field, { integer = false, min = 0, max = 1e9 } = {}) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    throw new RequestError(`${field} is invalid.`);
  }
  return value;
}

function metadata(body, output) {
  if ("imagePublicId" in body) {
    const id = text(body.imagePublicId ?? "", "Image public ID", 250);
    if (id && !/^premium-dukan\/(?:products|banners)\/[a-zA-Z0-9_-]+$/.test(id))
      throw new RequestError("Invalid managed image public ID.");
    output.imagePublicId = id;
  }
  for (const field of ["imageWidth", "imageHeight"]) {
    if (field in body)
      output[field] =
        body[field] == null
          ? null
          : number(body[field], field, { integer: true, min: 1, max: 40000 });
  }
}

function object(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new RequestError("Expected a JSON object.");
  if (
    Object.keys(body).some(
      (key) =>
        key.startsWith("$") ||
        key.includes(".") ||
        ["__proto__", "constructor", "prototype"].includes(key),
    )
  )
    throw new RequestError("Invalid record fields.");
}

function productInput(body, partial = false) {
  object(body);
  const output = {};
  for (const field of ["name", "category"])
    if (!partial || field in body)
      output[field] = text(body[field], field, 200, true);
  if (!partial || "price" in body) output.price = number(body.price, "Price");
  if ("stock" in body)
    output.stock = number(body.stock, "Stock", { integer: true });
  else if (!partial) output.stock = 0;
  for (const [field, max] of [
    ["description", 20000],
    ["planLabel", 200],
  ]) {
    if (field in body) output[field] = text(body[field], field, max);
  }
  if ("durationMonths" in body)
    output.durationMonths =
      body.durationMonths == null
        ? null
        : number(body.durationMonths, "Duration in months", {
            integer: true,
            min: 1,
            max: 1200,
          });
  if ("imageUrl" in body) output.imageUrl = imageUrl(body.imageUrl);
  metadata(body, output);
  return output;
}

function bannerInput(body, partial = false) {
  object(body);
  const output = {};
  for (const field of ["title", "altText"])
    if (!partial || field in body)
      output[field] = text(body[field], field, 200, true);
  if (!partial || "imageUrl" in body)
    output.imageUrl = imageUrl(body.imageUrl, true);
  if (!partial || "targetUrl" in body)
    output.targetUrl = targetUrl(body.targetUrl);
  if ("sortOrder" in body)
    output.sortOrder = number(body.sortOrder, "Display order", {
      integer: true,
      max: 100000,
    });
  else if (!partial) output.sortOrder = 0;
  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean")
      throw new RequestError("Active status must be true or false.");
    output.isActive = body.isActive;
  } else if (!partial) output.isActive = false;
  metadata(body, output);
  return output;
}

function parseJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    const timer = setTimeout(
      () => reject(new RequestError("Request timed out.", 408)),
      15000,
    );
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > 256 * 1024) {
        clearTimeout(timer);
        reject(new RequestError("Request is too large.", 413));
      } else chunks.push(chunk);
    });
    req.on("end", () => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}"));
      } catch {
        reject(new RequestError("Invalid JSON."));
      }
    });
    req.on("error", () => {
      clearTimeout(timer);
      reject(new RequestError("Request interrupted."));
    });
    req.on("aborted", () => {
      clearTimeout(timer);
      reject(new RequestError("Request interrupted."));
    });
  });
}

module.exports = {
  RequestError,
  imageUrl,
  targetUrl,
  productInput,
  bannerInput,
  parseJson,
};
