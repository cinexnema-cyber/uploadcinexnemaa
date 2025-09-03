import type { RequestHandler } from "express";
import { getAdminClient } from "../supabase";

export const listPublic: RequestHandler = async (_req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });
  
  try {
    const { data, error } = await sb
      .from("videos")
      .select("*")
      .eq("aprovado", true)
      .order("created_at", { ascending: false });
      
    if (error) {
      // Se a tabela não existe, retornar lista vazia
      if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
        console.warn("Tabela 'videos' não encontrada. Retornando lista vazia.");
        return res.json({ videos: [], warning: "Tabelas não configuradas" });
      }
      return res.status(500).json({ error: error.message });
    }
    res.json({ videos: data ?? [] });
  } catch (err: any) {
    console.error("Erro ao buscar vídeos públicos:", err);
    res.json({ videos: [], warning: "Erro ao buscar vídeos" });
  }
};

export const listAll: RequestHandler = async (_req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });
  
  try {
    const { data, error } = await sb
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
        console.warn("Tabela 'videos' não encontrada. Retornando lista vazia.");
        return res.json({ videos: [], warning: "Tabelas não configuradas" });
      }
      return res.status(500).json({ error: error.message });
    }
    res.json({ videos: data ?? [] });
  } catch (err: any) {
    console.error("Erro ao buscar todos os vídeos:", err);
    res.json({ videos: [], warning: "Erro ao buscar vídeos" });
  }
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
      if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
        console.warn("Tabela 'videos' não encontrada. Simulando sucesso.");
        return res.json({ 
          video: { 
            id: Date.now().toString(), 
            titulo: title?.trim() || "Vídeo sem título",
            created_at: new Date().toISOString()
          },
          warning: "Tabelas não configuradas - dados não salvos"
        });
      }
      return res.status(500).json({ 
        error: "DATABASE_ERROR", 
        message: error.message 
      });
    }

    res.json({ video });
  } catch (e: any) {
    console.error("Erro ao submeter vídeo:", e);
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
  
  try {
    const { data: video, error } = await sb
      .from("videos")
      .update({ aprovado: true })
      .eq("id", id)
      .select()
      .single();
      
    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
        return res.json({ warning: "Tabelas não configuradas" });
      }
      return res.status(500).json({ error: error.message });
    }
    if (!video) return res.status(404).json({ error: "NOT_FOUND" });
    
    res.json({ video });
  } catch (err: any) {
    console.error("Erro ao aprovar vídeo:", err);
    res.status(500).json({ error: "Erro interno" });
  }
};

export const revokeVideo: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });
  
  const { id } = req.params as { id: string };
  
  try {
    const { data: video, error } = await sb
      .from("videos")
      .update({ aprovado: false })
      .eq("id", id)
      .select()
      .single();
      
    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
        return res.json({ warning: "Tabelas não configuradas" });
      }
      return res.status(500).json({ error: error.message });
    }
    if (!video) return res.status(404).json({ error: "NOT_FOUND" });
    
    res.json({ video });
  } catch (err: any) {
    console.error("Erro ao revogar vídeo:", err);
    res.status(500).json({ error: "Erro interno" });
  }
};

export const getConfig: RequestHandler = async (_req, res) => {
  const sb = getAdminClient();
  
  // Verificar se as tabelas existem
  let tablesExist = false;
  if (sb) {
    try {
      await sb.from("videos").select("id").limit(1);
      tablesExist = true;
    } catch (error) {
      tablesExist = false;
    }
  }
  
  res.json({ 
    muxConfigured: false, 
    supabaseConfigured: !!sb,
    tablesConfigured: tablesExist
  });
};
