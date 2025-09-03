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

  try {
    const { data, error } = await sb.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ signedUrl: data?.signedUrl, path, bucket, expiresIn });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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

  try {
    const key = `${prefix}/${encodeURIComponent(filename)}`;
    const { data, error } = await sb.storage
      .from(bucket)
      .createSignedUploadUrl(key);

    if (error) {
      // Se o bucket não existe, tentar criar
      if (error.message.includes("does not exist")) {
        console.log(`Tentando criar bucket: ${bucket}`);
        const { error: createError } = await sb.storage.createBucket(bucket, {
          public: bucket === "covers", // covers é público, videos é privado
        });

        if (createError && !createError.message.includes("already exists")) {
          return res.status(500).json({
            error: "Erro ao criar bucket",
            details: createError.message,
          });
        }

        // Tentar novamente após criar o bucket
        const { data: retryData, error: retryError } = await sb.storage
          .from(bucket)
          .createSignedUploadUrl(key);

        if (retryError) {
          return res.status(500).json({ error: retryError.message });
        }

        const pub = sb.storage.from(bucket).getPublicUrl(key);
        return res.json({
          bucket,
          path: key,
          token: retryData.token,
          publicUrl: pub.data.publicUrl,
          created_bucket: true,
        });
      }

      return res.status(500).json({ error: error.message });
    }

    const pub = sb.storage.from(bucket).getPublicUrl(key);
    res.json({
      bucket,
      path: key,
      token: data.token,
      publicUrl: pub.data.publicUrl,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createBuckets: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });

  try {
    const buckets = [
      { name: "videos", public: false },
      { name: "covers", public: true },
      { name: "banners", public: true },
      { name: "thumbnails", public: true },
      { name: "screenshots", public: true },
    ];

    const results = [];

    for (const bucketConfig of buckets) {
      const { data, error } = await sb.storage.createBucket(bucketConfig.name, {
        public: bucketConfig.public,
      });

      if (error && !error.message.includes("already exists")) {
        console.error(`Erro ao criar bucket ${bucketConfig.name}:`, error);
        results.push({
          bucket: bucketConfig.name,
          status: "error",
          error: error.message,
        });
      } else {
        results.push({
          bucket: bucketConfig.name,
          status: "created",
          public: bucketConfig.public,
        });
      }
    }

    res.json({
      success: true,
      message: "Buckets configurados",
      results,
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Erro ao criar buckets",
      details: error.message,
    });
  }
};

export const checkBuckets: RequestHandler = async (req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });

  try {
    const { data: buckets, error } = await sb.storage.listBuckets();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const requiredBuckets = [
      "videos",
      "covers",
      "banners",
      "thumbnails",
      "screenshots",
    ];
    const existingBuckets = buckets?.map((b) => b.name) || [];
    const missingBuckets = requiredBuckets.filter(
      (b) => !existingBuckets.includes(b),
    );

    res.json({
      existing: existingBuckets,
      missing: missingBuckets,
      allConfigured: missingBuckets.length === 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
