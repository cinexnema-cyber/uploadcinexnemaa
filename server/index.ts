import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  approveVideo,
  listAll,
  listPublic,
  submit,
  revokeVideo,
  getConfig,
} from "./routes/videos";
import {
  uploadCover as creatorUploadCover,
  listMyVideos as creatorList,
  deleteVideo as creatorDelete,
  dashboard as creatorDashboard,
  createVideoUpload as creatorCreateUpload,
  completeVideoUpload as creatorCompleteUpload,
} from "./routes/creators";
import { createSignedUrl, createSignedUpload } from "./routes/storage";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Video routes
  app.get("/api/videos/public", listPublic);
  app.get("/api/videos", listAll);
  app.post("/api/videos/submit", submit);
  app.post("/api/videos/:id/approve", approveVideo);
  app.post("/api/videos/:id/revoke", revokeVideo);

  // Creator routes
  app.post("/api/creators/cover", ...creatorUploadCover);
  app.get("/api/creators/videos", creatorList);
  app.delete("/api/creators/video/:id", creatorDelete);
  app.get("/api/creators/dashboard", creatorDashboard);
  app.post("/api/creators/upload", creatorCreateUpload);
  app.post("/api/creators/upload-complete", creatorCompleteUpload);

  // Storage routes
  app.post("/api/storage/signed-url", createSignedUrl);
  app.post("/api/storage/signed-upload", createSignedUpload);

  return app;
}
