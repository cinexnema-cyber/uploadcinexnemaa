import type { RequestHandler } from "express";
import { getAdminClient } from "../supabase";

export const listPublic: RequestHandler = async (_req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });
  
  const { data, error } = await sb
    .from("videos")
    .select("*")
    .eq("aprovado", true)
    .order("created_at", { ascending: false });
    
  if (error) return res.status(500).json({ error: error.message });
  res.json({ videos: data ?? [] });
};

export const listAll: RequestHandler = async (_req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });
  
  const { data, error } = await sb
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });
    
  if (error) return res.status(500).json({ error: error.message });
  res.json({ videos: data ?? [] });
};

export const submit: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });
  
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

  try {
    const { data: video, error } = await sb
      .from("videos")
      .insert({
        creator_id: null, // Upload público, sem criador específico
        titulo: title?.trim() || "Vídeo sem título",
        descricao: bio?.trim() || null,
        formato: format || null,
        generos: Array.isArray(genres) ? genres : null,
        video_url: publicUrl,
        bucket: bucket || null,
        video_path: storagePath || null,
        status: "uploaded",
        aprovado: false
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ 
        error: "DATABASE_ERROR", 
        message: error.message 
      });
    }

    res.json({ video });
  } catch (e: any) {
    res.status(500).json({
      error: "SUBMIT_FAILED",
      message: e?.message || String(e),
    });
  }
};

export const approveVideo: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });
  
  const { id } = req.params as { id: string };
  
  const { data: video, error } = await sb
    .from("videos")
    .update({ aprovado: true })
    .eq("id", id)
    .select()
    .single();
    
  if (error) return res.status(500).json({ error: error.message });
  if (!video) return res.status(404).json({ error: "NOT_FOUND" });
  
  res.json({ video });
};

export const revokeVideo: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });
  
  const { id } = req.params as { id: string };
  
  const { data: video, error } = await sb
    .from("videos")
    .update({ aprovado: false })
    .eq("id", id)
    .select()
    .single();
    
  if (error) return res.status(500).json({ error: error.message });
  if (!video) return res.status(404).json({ error: "NOT_FOUND" });
  
  res.json({ video });
};

export const getConfig: RequestHandler = async (_req, res) => {
  // Como não usamos mais Mux, sempre retorna false
  res.json({ muxConfigured: false, supabaseConfigured: !!getAdminClient() });
};
