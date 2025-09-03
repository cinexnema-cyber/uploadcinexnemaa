import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DiagnosticResult {
  step: string;
  status: "success" | "error" | "warning";
  message: string;
  details?: any;
}

export default function SupabaseDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testFile, setTestFile] = useState<File | null>(null);

  const addResult = (result: DiagnosticResult) => {
    setResults((prev) => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  async function runFullDiagnostic() {
    setIsRunning(true);
    clearResults();

    try {
      // 1. Verificar configuração básica
      addResult({
        step: "1. Verificação de Configuração",
        status: "success",
        message: "Iniciando diagnóstico completo do Supabase...",
      });

      // Verificar URL e chaves
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl) {
        addResult({
          step: "1.1 URL do Supabase",
          status: "error",
          message: "VITE_SUPABASE_URL não definida",
          details: "Configure a variável de ambiente VITE_SUPABASE_URL",
        });
        return;
      }

      if (!supabaseKey) {
        addResult({
          step: "1.2 Chave Anônima",
          status: "error",
          message: "VITE_SUPABASE_ANON_KEY não definida",
          details: "Configure a variável de ambiente VITE_SUPABASE_ANON_KEY",
        });
        return;
      }

      addResult({
        step: "1.1 URL do Supabase",
        status: "success",
        message: `✓ URL configurada: ${supabaseUrl}`,
        details: { url: supabaseUrl },
      });

      addResult({
        step: "1.2 Chave Anônima",
        status: "success",
        message: `✓ Chave configurada: ${supabaseKey.substring(0, 20)}...`,
        details: { keyLength: supabaseKey.length },
      });

      // 2. Verificar conexão com Supabase
      if (!supabase) {
        addResult({
          step: "2. Cliente Supabase",
          status: "error",
          message: "Cliente Supabase não inicializado",
          details: "Verifique se as credenciais estão corretas",
        });
        return;
      }

      addResult({
        step: "2. Cliente Supabase",
        status: "success",
        message: "✓ Cliente Supabase inicializado com sucesso",
      });

      // 3. Testar autenticação
      try {
        const { data: session, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) {
          addResult({
            step: "3. Teste de Autenticação",
            status: "warning",
            message: `Erro na sessão: ${sessionError.message}`,
            details: sessionError,
          });
        } else {
          addResult({
            step: "3. Teste de Autenticação",
            status: "success",
            message: session
              ? "✓ Usuário autenticado"
              : "⚠ Nenhum usuário logado (OK para teste)",
          });
        }
      } catch (authError: any) {
        addResult({
          step: "3. Teste de Autenticação",
          status: "error",
          message: `Erro na autenticação: ${authError.message}`,
          details: authError,
        });
      }

      // 4. Verificar buckets do Storage
      try {
        const { data: buckets, error: bucketsError } =
          await supabase.storage.listBuckets();

        if (bucketsError) {
          addResult({
            step: "4. Verificação de Buckets",
            status: "error",
            message: `Erro ao listar buckets: ${bucketsError.message}`,
            details: bucketsError,
          });
        } else {
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

          addResult({
            step: "4.1 Lista de Buckets",
            status: "success",
            message: `✓ Encontrados ${existingBuckets.length} buckets: ${existingBuckets.join(", ")}`,
            details: { existing: existingBuckets, missing: missingBuckets },
          });

          if (missingBuckets.length > 0) {
            addResult({
              step: "4.2 Buckets Ausentes",
              status: "warning",
              message: `⚠ Buckets não encontrados: ${missingBuckets.join(", ")}`,
              details: { missing: missingBuckets },
            });
          } else {
            addResult({
              step: "4.2 Buckets Necessários",
              status: "success",
              message: "✓ Todos os buckets necessários existem",
            });
          }
        }
      } catch (storageError: any) {
        addResult({
          step: "4. Verificação de Buckets",
          status: "error",
          message: `Erro no Storage: ${storageError.message}`,
          details: storageError,
        });
      }

      // 5. Teste de upload (se arquivo fornecido)
      if (testFile) {
        await testFileUpload(testFile);
      } else {
        addResult({
          step: "5. Teste de Upload",
          status: "warning",
          message: "⚠ Nenhum arquivo selecionado para teste",
          details: "Selecione um arquivo pequeno para testar o upload",
        });
      }
    } catch (error: any) {
      addResult({
        step: "Erro Geral",
        status: "error",
        message: `Erro inesperado: ${error.message}`,
        details: error,
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function testFileUpload(file: File) {
    try {
      addResult({
        step: "5.1 Preparando Upload",
        status: "success",
        message: `Testando upload do arquivo: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
      });

      // Testar upload no bucket 'videos'
      const fileName = `test-${Date.now()}-${file.name}`;
      const filePath = `diagnostic/${fileName}`;

      const { data, error } = await supabase!.storage
        .from("videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        addResult({
          step: "5.2 Upload para Bucket 'videos'",
          status: "error",
          message: `Erro no upload: ${error.message}`,
          details: { error, fileName, filePath },
        });
      } else {
        addResult({
          step: "5.2 Upload para Bucket 'videos'",
          status: "success",
          message: `✓ Upload realizado com sucesso`,
          details: { data, fileName, filePath },
        });

        // Testar URL pública
        const { data: publicUrl } = supabase!.storage
          .from("videos")
          .getPublicUrl(filePath);

        addResult({
          step: "5.3 URL Pública",
          status: "success",
          message: `✓ URL gerada: ${publicUrl.publicUrl}`,
          details: { publicUrl: publicUrl.publicUrl },
        });

        // Limpar arquivo de teste
        try {
          await supabase!.storage.from("videos").remove([filePath]);
          addResult({
            step: "5.4 Limpeza",
            status: "success",
            message: "✓ Arquivo de teste removido",
          });
        } catch (cleanError) {
          addResult({
            step: "5.4 Limpeza",
            status: "warning",
            message: "⚠ Não foi possível remover arquivo de teste",
          });
        }
      }
    } catch (uploadError: any) {
      addResult({
        step: "5. Teste de Upload",
        status: "error",
        message: `Erro no teste de upload: ${uploadError.message}`,
        details: uploadError,
      });
    }
  }

  async function createMissingBuckets() {
    if (!supabase) return;

    const requiredBuckets = [
      { name: "videos", public: false },
      { name: "covers", public: true },
      { name: "banners", public: true },
      { name: "thumbnails", public: true },
      { name: "screenshots", public: true },
    ];

    for (const bucket of requiredBuckets) {
      try {
        const { error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
        });

        if (error && !error.message.includes("already exists")) {
          toast.error(`Erro ao criar bucket ${bucket.name}: ${error.message}`);
        } else {
          toast.success(`Bucket ${bucket.name} criado/verificado`);
        }
      } catch (error: any) {
        toast.error(`Erro ao criar bucket ${bucket.name}: ${error.message}`);
      }
    }

    toast.success("Processo de criação de buckets concluído");
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-emerald-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-amber-400";
      default:
        return "text-blue-400";
    }
  };

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          🔍 Diagnóstico Completo do Supabase
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Controles */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Controles de Teste</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Arquivo para Teste de Upload (opcional)
                </label>
                <Input
                  type="file"
                  onChange={(e) => setTestFile(e.target.files?.[0] || null)}
                  className="bg-transparent border-white/20 text-white"
                  accept="image/*,video/*"
                />
                {testFile && (
                  <div className="text-xs text-white/70 mt-1">
                    Selecionado: {testFile.name} (
                    {(testFile.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={runFullDiagnostic}
                  disabled={isRunning}
                  className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
                >
                  {isRunning ? "Executando..." : "🚀 Executar Diagnóstico"}
                </Button>

                <Button
                  onClick={createMissingBuckets}
                  variant="outline"
                  className="border-amber-500 text-amber-400"
                >
                  🪣 Criar Buckets
                </Button>
              </div>
            </div>
          </div>

          {/* Informações */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Configuração Atual</h2>

            <div className="space-y-2 text-sm">
              <div>
                <strong>URL:</strong>{" "}
                {import.meta.env.VITE_SUPABASE_URL || "❌ Não configurada"}
              </div>
              <div>
                <strong>Anon Key:</strong>{" "}
                {import.meta.env.VITE_SUPABASE_ANON_KEY
                  ? `✅ ${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...`
                  : "❌ Não configurada"}
              </div>
              <div>
                <strong>Cliente:</strong>{" "}
                {supabase ? "✅ Conectado" : "❌ Não conectado"}
              </div>
            </div>
          </div>
        </div>

        {/* Resultados */}
        {results.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Resultados do Diagnóstico
              </h2>
              <Button
                onClick={clearResults}
                size="sm"
                variant="outline"
                className="border-white/20 text-white/60"
              >
                Limpar
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="border border-white/10 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">
                      {getStatusIcon(result.status)}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <strong className={getStatusColor(result.status)}>
                          {result.step}
                        </strong>
                      </div>
                      <div className="text-white/80 text-sm">
                        {result.message}
                      </div>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-white/60 hover:text-white/80">
                            Ver detalhes
                          </summary>
                          <pre className="mt-1 p-2 bg-black/30 rounded text-xs overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guia de Resolução */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-blue-400 mb-4">
            📚 Guia de Resolução de Problemas
          </h3>

          <div className="space-y-4 text-sm text-white/80">
            <div>
              <h4 className="font-semibold text-white mb-2">
                🔧 Problemas Comuns e Soluções:
              </h4>
              <ul className="space-y-2 list-disc list-inside">
                <li>
                  <strong>Bucket não existe:</strong> Clique em "🪣 Criar
                  Buckets" para criar automaticamente
                </li>
                <li>
                  <strong>Arquivo muito grande:</strong> Supabase tem limite de
                  ~50MB a 5GB (dependendo do plano)
                </li>
                <li>
                  <strong>Permissões do bucket:</strong> Buckets privados
                  requerem autenticação
                </li>
                <li>
                  <strong>Caminho do arquivo:</strong> Não pode começar com /,
                  nem ter caracteres especiais
                </li>
                <li>
                  <strong>Chave incorreta:</strong> Anon key pode não ter
                  permissão para upload em buckets privados
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">
                ⚙️ Configuração Recomendada no Painel Supabase:
              </h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Storage → Buckets → Criar buckets necessários</li>
                <li>Storage → Configuration → Ajustar limites de upload</li>
                <li>
                  Authentication → Settings → Configurar URLs e confirmações
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Links úteis */}
        <div className="flex gap-2 mt-6">
          <Button
            onClick={() => (window.location.href = "/test-auth")}
            variant="outline"
            className="border-blue-500 text-blue-400"
          >
            🧪 Teste de Auth
          </Button>
          <Button
            onClick={() => (window.location.href = "/setup")}
            variant="outline"
            className="border-amber-500 text-amber-400"
          >
            ⚙️ Setup Geral
          </Button>
          <Button
            onClick={() => (window.location.href = "/creator")}
            variant="outline"
            className="border-emerald-500 text-emerald-400"
          >
            👤 Área do Criador
          </Button>
        </div>
      </div>
    </div>
  );
}
