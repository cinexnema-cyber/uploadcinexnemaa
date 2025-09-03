import type { RequestHandler } from "express";
import multer from "multer";
import path from "node:path";
import { getAdminClient, getUserFromRequest } from "../supabase";
import Mux from "@mux/mux-node";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function getMux(): { video: Mux.Video } | null {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) return null;
  const mux = new Mux({ tokenId, tokenSecret });
  return { video: mux.video };
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });
  (req as any).user = user;
  next();
};

export const uploadCover = [
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    const sb = getAdminClient();
    if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: "NO_FILE" });
    const bucket = process.env.SUPABASE_COVERS_BUCKET || "covers";
    const ext = path.extname(file.originalname) || ".jpg";
    const user = (req as any).user;
    const key = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const { error } = await sb.storage
      .from(bucket)
      .upload(key, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error)
      return res
        .status(500)
        .json({ error: "UPLOAD_FAILED", message: error.message });
    const { data: pub } = sb.storage.from(bucket).getPublicUrl(key);
    res.json({ url: pub.publicUrl, path: key, bucket });
  },
] as unknown as RequestHandler[];

export const listMyVideos: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  const user = await getUserFromRequest(req);
  if (!sb || !user) return res.status(401).json({ error: "UNAUTHORIZED" });
  const { data, error } = await sb
    .from("videos")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ videos: data ?? [] });
};

export const deleteVideo: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  const user = await getUserFromRequest(req);
  if (!sb || !user) return res.status(401).json({ error: "UNAUTHORIZED" });
  const { id } = req.params as { id: string };
  const { error } = await sb
    .from("videos")
    .delete()
    .eq("id", id)
    .eq("creator_id", user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
};

export const dashboard: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  const user = await getUserFromRequest(req);
  if (!sb || !user) return res.status(401).json({ error: "UNAUTHORIZED" });
  const { data: rows } = await sb
    .from("earnings")
    .select("receita_total, comissao_criador, comissao_plataforma, mes_ref")
    .eq("creator_id", user.id)
    .order("mes_ref", { ascending: false });
  const totals = (rows ?? []).reduce(
    (acc, r) => {
      acc.receita_total += Number(r.receita_total || 0);
      acc.comissao_criador += Number(r.comissao_criador || 0);
      acc.comissao_plataforma += Number(r.comissao_plataforma || 0);
      return acc;
    },
    { receita_total: 0, comissao_criador: 0, comissao_plataforma: 0 },
  );
  res.json({ totals, rows: rows ?? [] });
};

export const requestUpload: RequestHandler = async (req, res) => {
  const mux = getMux();
  const sb = getAdminClient();
  const user = await getUserFromRequest(req);
  if (!mux || !sb || !user)
    return res.status(400).json({ error: "CONFIG_MISSING" });
  const { title, description, tags, coverUrl } = (req.body || {}) as {
    title?: string;
    description?: string;
    tags?: string[] | string;
    coverUrl?: string;
  };

  try {
    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: { playback_policy: ["public"] },
    });

    // create a pending row
    const { error } = await sb.from("videos").insert({
      id: upload.id,
      creator_id: user.id,
      titulo: title ?? "",
      descricao: description ?? "",
      tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
      capa_url: coverUrl ?? null,
      status: "pending_upload",
      mux_asset_id: null,
      playback_id: null,
    });
    if (error) console.error("insert video row error", error);

    res.json({ uploadUrl: upload.url, uploadId: upload.id });
  } catch (e: any) {
    const status = e?.status || e?.statusCode;
    const msg = e?.message || String(e);
    const isUnauthorized = status === 401 || /unauthorized/i.test(msg || "");
    res
      .status(isUnauthorized ? 401 : 500)
      .json({
        error: isUnauthorized ? "MUX_UNAUTHORIZED" : "MUX_CREATE_UPLOAD_FAILED",
        message: msg,
      });
  }
};

export const uploadComplete: RequestHandler = async (req, res) => {
  const mux = getMux();
  const sb = getAdminClient();
  const user = await getUserFromRequest(req);
  if (!mux || !sb || !user)
    return res.status(400).json({ error: "CONFIG_MISSING" });
  const { uploadId } = (req.body || {}) as { uploadId?: string };
  if (!uploadId) return res.status(400).json({ error: "BAD_REQUEST" });
  try {
    const upload = await mux.video.uploads.retrieve(uploadId);
    let playbackId: string | null = null;
    if (upload.asset_id) {
      const asset = await mux.video.assets.retrieve(upload.asset_id);
      playbackId = asset.playback_ids?.[0]?.id ?? null;
      await sb
        .from("videos")
        .update({
          mux_asset_id: upload.asset_id,
          playback_id: playbackId,
          status: asset.status,
        })
        .eq("id", uploadId)
        .eq("creator_id", user.id);
    } else {
      await sb
        .from("videos")
        .update({ status: "processing" })
        .eq("id", uploadId)
        .eq("creator_id", user.id);
    }
    res.json({ ok: true, uploadId, playbackId });
  } catch (e: any) {
    const status = e?.status || e?.statusCode;
    const msg = e?.message || String(e);
    const isUnauthorized = status === 401 || /unauthorized/i.test(msg || "");
    res
      .status(isUnauthorized ? 401 : 500)
      .json({
        error: isUnauthorized ? "MUX_UNAUTHORIZED" : "MUX_UPLOAD_CHECK_FAILED",
        message: msg,
      });
  }
};
