import type { RequestHandler } from "express";
import multer from "multer";
import path from "node:path";
import { getAdminClient, getUserFromRequest } from "../supabase";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB para vídeos
});

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

  try {
    const { data, error } = await sb
      .from("videos")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return res.json({ videos: [], warning: "Tabelas não configuradas" });
      }
      return res.status(500).json({ error: error.message });
    }
    res.json({ videos: data ?? [] });
  } catch (err: any) {
    console.error("Erro ao buscar vídeos do criador:", err);
    res.json({ videos: [], warning: "Erro ao buscar vídeos" });
  }
};

export const deleteVideo: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  const user = await getUserFromRequest(req);
  if (!sb || !user) return res.status(401).json({ error: "UNAUTHORIZED" });
  const { id } = req.params as { id: string };

  try {
    // Buscar dados do vídeo antes de deletar
    const { data: video } = await sb
      .from("videos")
      .select("video_path, capa_path, bucket")
      .eq("id", id)
      .eq("creator_id", user.id)
      .single();

    // Deletar registro do banco
    const { error } = await sb
      .from("videos")
      .delete()
      .eq("id", id)
      .eq("creator_id", user.id);
    if (error) return res.status(500).json({ error: error.message });

    // Deletar arquivos do storage se existirem
    if (video?.video_path) {
      await sb.storage
        .from(video.bucket || "videos")
        .remove([video.video_path]);
    }
    if (video?.capa_path) {
      await sb.storage.from("covers").remove([video.capa_path]);
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error("Erro ao deletar vídeo:", err);
    res.status(500).json({ error: "Erro interno" });
  }
};

export const dashboard: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  const user = await getUserFromRequest(req);
  if (!sb || !user) return res.status(401).json({ error: "UNAUTHORIZED" });

  try {
    // Buscar estatísticas dos vídeos
    const { data: videosData } = await sb
      .from("videos")
      .select("id, aprovado, custo_mensal, created_at")
      .eq("creator_id", user.id);

    const videos = videosData || [];
    const totalVideos = videos.length;
    const videosAprovados = videos.filter((v) => v.aprovado).length;
    const custoMensalTotal = videos.reduce(
      (sum, v) => sum + (Number(v.custo_mensal) || 0),
      0,
    );

    // Buscar ganhos (se existirem)
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

    res.json({
      totals,
      rows: rows ?? [],
      stats: {
        totalVideos,
        videosAprovados,
        custoMensalTotal,
      },
    });
  } catch (err: any) {
    console.error("Erro ao buscar dashboard:", err);
    res.json({
      totals: { receita_total: 0, comissao_criador: 0, comissao_plataforma: 0 },
      rows: [],
      stats: { totalVideos: 0, videosAprovados: 0, custoMensalTotal: 0 },
    });
  }
};

export const createVideoUpload: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  const user = await getUserFromRequest(req);
  if (!sb || !user) return res.status(400).json({ error: "CONFIG_MISSING" });

  const {
    titulo,
    descricao,
    formato,
    generos,
    projeto,
    capaUrl,
    duracaoMinutos,
  } = (req.body || {}) as {
    titulo?: string;
    descricao?: string;
    formato?: string;
    generos?: string[];
    projeto?: string;
    capaUrl?: string;
    duracaoMinutos?: number;
  };

  try {
    // Calcular custo baseado na duração
    const duracao = duracaoMinutos || 0;
    let custo = 0;
    if (duracao > 70) {
      const blocosExtras = Math.ceil((duracao - 70) / 70);
      custo = blocosExtras * 1000;
    }

    // Gerar signed URL para upload do vídeo
    const videoFilename = `${Date.now()}-video.mp4`;
    const videoPath = `${user.id}/${videoFilename}`;
    const bucket = "videos";

    const { data: signedData, error: signedError } = await sb.storage
      .from(bucket)
      .createSignedUploadUrl(videoPath);

    if (signedError) {
      return res.status(500).json({
        error: "SIGNED_URL_FAILED",
        message: signedError.message,
      });
    }

    // Criar registro no banco
    const { data: videoData, error: insertError } = await sb
      .from("videos")
      .insert({
        creator_id: user.id,
        titulo: titulo || "Sem título",
        descricao: descricao || "",
        formato: formato || null,
        generos: generos || [],
        capa_url: capaUrl || null,
        bucket,
        video_path: videoPath,
        duracao_minutos: duracao,
        custo_mensal: custo,
        status: "uploading",
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        error: "DATABASE_ERROR",
        message: insertError.message,
      });
    }

    res.json({
      uploadUrl: signedData.signedUrl,
      uploadToken: signedData.token,
      videoId: videoData.id,
      videoPath,
      bucket,
    });
  } catch (e: any) {
    res.status(500).json({
      error: "CREATE_UPLOAD_FAILED",
      message: e?.message || String(e),
    });
  }
};

export const completeVideoUpload: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  const user = await getUserFromRequest(req);
  if (!sb || !user) return res.status(400).json({ error: "CONFIG_MISSING" });

  const { videoId } = (req.body || {}) as { videoId?: string };
  if (!videoId) return res.status(400).json({ error: "BAD_REQUEST" });

  try {
    // Atualizar status do vídeo
    const { data: video, error } = await sb
      .from("videos")
      .update({
        status: "uploaded",
        video_url: null, // Será preenchida quando aprovarmos
      })
      .eq("id", videoId)
      .eq("creator_id", user.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: "UPDATE_FAILED",
        message: error.message,
      });
    }

    // Gerar URL pública do vídeo
    if (video.video_path) {
      const { data: publicUrl } = sb.storage
        .from(video.bucket || "videos")
        .getPublicUrl(video.video_path);

      await sb
        .from("videos")
        .update({ video_url: publicUrl.publicUrl })
        .eq("id", videoId);
    }

    res.json({ ok: true, videoId, video });
  } catch (e: any) {
    res.status(500).json({
      error: "COMPLETE_UPLOAD_FAILED",
      message: e?.message || String(e),
    });
  }
};

export const uploadCompleteForm: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  const user = await getUserFromRequest(req);
  if (!sb || !user) return res.status(400).json({ error: "CONFIG_MISSING" });

  const formData = req.body as any;

  try {
    // Calcular custo baseado na duração
    const duracao = formData.duracao || 0;
    let custo = 0;
    if (duracao > 70) {
      const blocosExtras = Math.ceil((duracao - 70) / 70);
      custo = blocosExtras * 1000;
    }

    // Criar registro completo no banco
    const { data: video, error } = await sb
      .from("videos")
      .insert({
        creator_id: user.id,
        titulo: formData.titulo,
        titulo_alternativo: formData.tituloAlternativo,
        descricao: formData.sinopseCurta,
        descricao_longa: formData.descricaoLonga,
        formato: formData.tipoConteudo,
        generos: formData.generos,
        ano_lancamento: formData.anoLancamento,
        duracao_minutos: formData.duracao,
        idioma_original: formData.idiomaOriginal,
        legendas_disponiveis: formData.legendasDisponiveis,
        diretores: formData.diretores,
        produtores: formData.produtores,
        elenco: formData.elenco,
        classificacao: formData.classificacao,

        // URLs das imagens
        capa_url: formData.capaUrl,
        banner_url: formData.bannerUrl,
        thumbnail_url: formData.thumbnailUrl,
        screenshots_urls: formData.screenshotsUrls,

        // URL do vídeo
        video_url: formData.videoUrl,

        // Metadados técnicos
        codec_video: formData.codecVideo,
        framerate: formData.framerate,
        bitrate: formData.bitrate,
        resolucao: formData.resolucao,

        // Direitos e acesso
        direitos_autorais: formData.direitosAutorais,
        tipo_acesso: formData.tipoAcesso,
        data_lancamento: formData.dataLancamento,
        restricao_geografica: formData.restricaoGeografica,

        // Extras
        trailer_url: formData.trailerUrl,
        conteudo_bonus: formData.conteudoBonus,
        tags: formData.tags,

        custo_mensal: custo,
        status: "uploaded",
        aprovado: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao salvar vídeo completo:", error);
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return res.json({
          success: true,
          warning: "Tabelas não configuradas - dados não salvos",
          video: { id: Date.now().toString(), titulo: formData.titulo },
        });
      }
      return res.status(500).json({
        error: "DATABASE_ERROR",
        message: error.message,
      });
    }

    res.json({ success: true, video });
  } catch (e: any) {
    console.error("Erro no upload completo:", e);
    res.status(500).json({
      error: "COMPLETE_FORM_FAILED",
      message: e?.message || String(e),
    });
  }
};
