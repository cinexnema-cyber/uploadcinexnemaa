import type { RequestHandler } from "express";
import { getAdminClient } from "../supabase";

export const createSignedUrl: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });
  const {
    bucket = "videos",
    path,
    expiresIn = 3600,
  } = (req.body || {}) as {
    bucket?: string;
    path?: string;
    expiresIn?: number;
  };
  if (!path)
    return res
      .status(400)
      .json({ error: "BAD_REQUEST", message: "path é obrigatório" });
  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ signedUrl: data?.signedUrl, path, bucket, expiresIn });
};

export const createSignedUpload: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });
  const {
    bucket = "videos",
    filename,
    prefix = "uploads",
  } = (req.body || {}) as {
    bucket?: string;
    filename?: string;
    prefix?: string;
  };
  if (!filename)
    return res
      .status(400)
      .json({ error: "BAD_REQUEST", message: "filename é obrigatório" });
  const key = `${prefix}/${encodeURIComponent(filename)}`;
  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUploadUrl(key);
  if (error) return res.status(500).json({ error: error.message });
  const pub = sb.storage.from(bucket).getPublicUrl(key);
  res.json({
    bucket,
    path: key,
    token: data.token,
    publicUrl: pub.data.publicUrl,
  });
};
