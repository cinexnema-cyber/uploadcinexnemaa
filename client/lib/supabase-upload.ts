import { supabase } from "./supabase";

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  filename?: string;
  cacheControl?: string;
  upsert?: boolean;
  maxSize?: number; // em bytes
}

export interface UploadResult {
  success: boolean;
  data?: {
    path: string;
    publicUrl: string;
    fullPath: string;
  };
  error?: string;
  details?: any;
}

/**
 * Upload de arquivo para Supabase Storage seguindo melhores práticas
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {},
): Promise<UploadResult> {
  try {
    // Validações básicas
    if (!supabase) {
      return {
        success: false,
        error: "Supabase não configurado",
        details:
          "Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas",
      };
    }

    if (!file) {
      return {
        success: false,
        error: "Nenhum arquivo fornecido",
      };
    }

    // Configurações padrão
    const {
      bucket = "videos",
      folder = "uploads",
      filename,
      cacheControl = "3600",
      upsert = false,
      maxSize = 500 * 1024 * 1024, // 500MB
    } = options;

    // Verificar tamanho do arquivo
    if (file.size > maxSize) {
      return {
        success: false,
        error: `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo: ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    // Gerar nome do arquivo seguro
    const safeFilename = filename || generateSafeFilename(file.name);

    // Construir caminho seguro (sem / no início, sem caracteres especiais)
    const filePath = `${folder}/${safeFilename}`;

    console.log(`📤 Iniciando upload: ${file.name} → ${bucket}/${filePath}`);

    // Executar upload
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl,
        upsert,
      });

    if (error) {
      console.error("❌ Erro no upload:", error);

      // Melhorar mensagens de erro
      let errorMessage = error.message;
      if (error.message.includes("does not exist")) {
        errorMessage = `Bucket '${bucket}' não existe. Crie o bucket primeiro.`;
      } else if (error.message.includes("already exists")) {
        errorMessage = `Arquivo já existe. Use upsert: true para substituir.`;
      } else if (error.message.includes("too large")) {
        errorMessage = `Arquivo muito grande para o plano atual do Supabase.`;
      } else if (error.message.includes("unauthorized")) {
        errorMessage = `Sem permissão para upload no bucket '${bucket}'. Verifique as políticas RLS.`;
      }

      return {
        success: false,
        error: errorMessage,
        details: error,
      };
    }

    // Gerar URL pública
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log("✅ Upload concluído:", data);

    return {
      success: true,
      data: {
        path: data.path,
        publicUrl: publicUrlData.publicUrl,
        fullPath: data.fullPath,
      },
    };
  } catch (error: any) {
    console.error("❌ Erro inesperado no upload:", error);
    return {
      success: false,
      error: `Erro inesperado: ${error.message}`,
      details: error,
    };
  }
}

/**
 * Gerar nome de arquivo seguro
 */
function generateSafeFilename(originalName: string): string {
  // Extrair extensão
  const lastDotIndex = originalName.lastIndexOf(".");
  const name =
    lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
  const extension =
    lastDotIndex > 0 ? originalName.substring(lastDotIndex) : "";

  // Limpar caracteres especiais
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-") // Substituir caracteres especiais por hífen
    .replace(/-+/g, "-") // Remover hífens duplicados
    .replace(/^-|-$/g, ""); // Remover hífens do início e fim

  // Adicionar timestamp para evitar conflitos
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  return `${timestamp}-${randomSuffix}-${safeName}${extension}`;
}

/**
 * Upload múltiplo de arquivos
 */
export async function uploadMultipleFiles(
  files: File[],
  options: UploadOptions = {},
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadFile(file, options);
    results.push(result);
  }

  return results;
}

/**
 * Verificar se bucket existe
 */
export async function checkBucketExists(bucketName: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) return false;

    return buckets?.some((bucket) => bucket.name === bucketName) || false;
  } catch {
    return false;
  }
}

/**
 * Criar bucket se não existir
 */
export async function ensureBucketExists(
  bucketName: string,
  isPublic: boolean = false,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase não configurado" };
  }

  try {
    // Verificar se já existe
    const exists = await checkBucketExists(bucketName);
    if (exists) {
      return { success: true };
    }

    // Criar bucket
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: isPublic,
    });

    if (error && !error.message.includes("already exists")) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Deletar arquivo
 */
export async function deleteFile(
  bucket: string,
  filePath: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase não configurado" };
  }

  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
