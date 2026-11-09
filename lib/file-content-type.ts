export function detectFileContentType(body: Buffer, fallback: string) {
  if (startsWith(body, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(body, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (body.subarray(0, 6).toString("ascii") === "GIF87a" || body.subarray(0, 6).toString("ascii") === "GIF89a") return "image/gif";
  if (body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (body.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";

  if (body.subarray(4, 8).toString("ascii") === "ftyp") {
    const brands = body.subarray(8, 32).toString("ascii");
    if (brands.includes("avif") || brands.includes("avis")) return "image/avif";
  }

  return fallback;
}

function startsWith(body: Buffer, signature: number[]) {
  return signature.every((byte, index) => body[index] === byte);
}
