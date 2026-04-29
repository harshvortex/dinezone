import type { FastifyInstance } from "fastify";
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { prisma } from "../lib/prisma";
import { verifyJWT, requireRole } from "../middleware/auth";
import type { JWTPayload } from "../middleware/auth";

// ─────────────────────────────────────────
// Configure Cloudinary
// ─────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env["CLOUDINARY_CLOUD_NAME"] ?? "",
  api_key:    process.env["CLOUDINARY_API_KEY"]    ?? "",
  api_secret: process.env["CLOUDINARY_API_SECRET"] ?? "",
  secure: true,
});

// ─────────────────────────────────────────
// Helper — upload buffer to Cloudinary
// ─────────────────────────────────────────
async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId?: string,
  transformation?: object
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:          `dinespot/${folder}`,
        public_id:       publicId,
        overwrite:       true,
        resource_type:   "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
        transformation:  transformation ?? [
          { width: 1200, height: 800, crop: "fill", gravity: "auto", quality: "auto:good", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Cloudinary upload failed"));
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// ─────────────────────────────────────────
// Upload routes plugin
// ─────────────────────────────────────────
export async function uploadRoutes(fastify: FastifyInstance) {

  // ── POST /upload/restaurant-image ─────────
  fastify.post(
    "/restaurant-image",
    { onRequest: [verifyJWT, requireRole("RESTAURANT_OWNER", "ADMIN")] },
    async (request, reply) => {
      const user = request.user as JWTPayload;
      const { restaurantId } = request.query as { restaurantId?: string };

      // Verify ownership if restaurantId provided
      if (restaurantId) {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: restaurantId },
          select: { ownerId: true },
        });
        if (!restaurant) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Restaurant not found" } });
        if (restaurant.ownerId !== user.sub && user.role !== "ADMIN") {
          return reply.status(403).send({ success: false, error: { code: "FORBIDDEN", message: "Not your restaurant" } });
        }
      }

      // Parse multipart file
      const file = await request.file();
      if (!file) return reply.status(400).send({ success: false, error: { code: "BAD_REQUEST", message: "No file uploaded" } });

      const mimeAllowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
      if (!mimeAllowed.includes(file.mimetype)) {
        return reply.status(400).send({ success: false, error: { code: "INVALID_FORMAT", message: "Only JPG, PNG, WebP, AVIF allowed" } });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of file.file) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      if (buffer.length > 10 * 1024 * 1024) {
        return reply.status(400).send({ success: false, error: { code: "FILE_TOO_LARGE", message: "Max file size is 10 MB" } });
      }

      const publicId = restaurantId ? `restaurant-${restaurantId}-${Date.now()}` : `restaurant-${Date.now()}`;
      const result = await uploadToCloudinary(buffer, "restaurants", publicId);

      // If restaurantId provided, optionally set as cover image
      const { setAsCover } = request.query as { setAsCover?: string };
      if (restaurantId && setAsCover === "true") {
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: { coverImage: result.secure_url },
        });
      }

      return reply.send({
        success: true,
        data: {
          url:       result.secure_url,
          publicId:  result.public_id,
          width:     result.width,
          height:    result.height,
          format:    result.format,
          bytes:     result.bytes,
        },
      });
    }
  );

  // ── POST /upload/avatar ───────────────────
  fastify.post(
    "/avatar",
    { onRequest: [verifyJWT] },
    async (request, reply) => {
      const user = request.user as JWTPayload;

      const file = await request.file();
      if (!file) return reply.status(400).send({ success: false, error: { code: "BAD_REQUEST", message: "No file uploaded" } });

      const mimeAllowed = ["image/jpeg", "image/png", "image/webp"];
      if (!mimeAllowed.includes(file.mimetype)) {
        return reply.status(400).send({ success: false, error: { code: "INVALID_FORMAT", message: "Only JPG, PNG, WebP allowed" } });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of file.file) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      if (buffer.length > 5 * 1024 * 1024) {
        return reply.status(400).send({ success: false, error: { code: "FILE_TOO_LARGE", message: "Max avatar size is 5 MB" } });
      }

      const result = await uploadToCloudinary(
        buffer,
        "avatars",
        `avatar-${user.sub}`,
        [{ width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto:good", fetch_format: "auto", radius: "max" }]
      );

      // Update user avatar in DB
      const updated = await prisma.user.update({
        where: { id: user.sub },
        data: { avatar: result.secure_url },
        select: { id: true, name: true, avatar: true },
      });

      return reply.send({
        success: true,
        data: { user: updated, url: result.secure_url },
      });
    }
  );

  // ── DELETE /upload/restaurant-image ───────
  fastify.delete(
    "/restaurant-image",
    { onRequest: [verifyJWT, requireRole("RESTAURANT_OWNER", "ADMIN")] },
    async (request, reply) => {
      const { publicId } = request.body as { publicId: string };
      if (!publicId) return reply.status(400).send({ success: false, error: { code: "BAD_REQUEST", message: "publicId required" } });

      await cloudinary.uploader.destroy(publicId);
      return reply.send({ success: true, data: null, message: "Image deleted" });
    }
  );
}
