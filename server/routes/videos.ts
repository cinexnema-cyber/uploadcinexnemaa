import fs from "node:fs";
import path from "node:path";
import type { RequestHandler } from "express";
import type { VideoRecord } from "../../shared/api";

// Simple JSON file store for demo purposes
const DATA_DIR = path.join(process.cwd(), "server", "data");
const DATA_PATH = path.join(DATA_DIR, "videos.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_PATH))
    fs.writeFileSync(DATA_PATH, JSON.stringify([]));
}

function readAll(): VideoRecord[] {
  ensureStore();
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  try {
    const list = JSON.parse(raw) as VideoRecord[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(list: VideoRecord[]) {
  ensureStore();
  fs.writeFileSync(DATA_PATH, JSON.stringify(list, null, 2));
}

export const listPublic: RequestHandler = async (_req, res) => {
  const all = readAll();
  const published = all
    .filter((v) => v.approved && !!v.publicUrl)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json({ videos: published });
};

export const listAll: RequestHandler = async (_req, res) => {
  const all = readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json({ videos: all });
};

function genId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export const submit: RequestHandler = async (req, res) => {
  const {
    title,
    bio,
    format,
    genres,
    project,
    publicUrl,
    bucket,
    path: storagePath,
  } = (req.body || {}) as {
    title?: string;
    bio?: string;
    format?: "Filme" | "Série" | "Seriado";
    genres?: string[];
    project?: string;
    publicUrl?: string;
    bucket?: string;
    path?: string;
  };

  if (!publicUrl)
    return res
      .status(400)
      .json({ error: "BAD_REQUEST", message: "publicUrl é obrigatório" });

  const record: VideoRecord = {
    id: genId(),
    title: title?.trim() || "Vídeo sem título",
    createdAt: new Date().toISOString(),
    status: "ready",
    approved: false,
    bio: bio?.trim() || null,
    format: format ?? null,
    genres: Array.isArray(genres) ? genres : null,
    project: project?.trim() || null,
    publicUrl,
    storageBucket: bucket || null,
    storagePath: storagePath || null,
  };

  const all = readAll();
  all.push(record);
  writeAll(all);

  res.json({ video: record });
};

export const approveVideo: RequestHandler = async (req, res) => {
  const { id } = req.params as { id: string };
  const all = readAll();
  const idx = all.findIndex((v) => v.id === id);
  if (idx === -1) return res.status(404).json({ error: "NOT_FOUND" });
  all[idx] = {
    ...all[idx],
    approved: true,
    status: all[idx].status === "ready" ? "approved" : all[idx].status,
  };
  writeAll(all);
  res.json({ video: all[idx] });
};

export const revokeVideo: RequestHandler = async (req, res) => {
  const { id } = req.params as { id: string };
  const all = readAll();
  const idx = all.findIndex((v) => v.id === id);
  if (idx === -1) return res.status(404).json({ error: "NOT_FOUND" });
  all[idx] = {
    ...all[idx],
    approved: false,
    status: all[idx].status === "approved" ? "ready" : all[idx].status,
  };
  writeAll(all);
  res.json({ video: all[idx] });
};
