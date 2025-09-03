import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { uploadFile, ensureBucketExists, UploadOptions } from "@/lib/supabase-upload";

interface UploadTest {
  id: string;
  file: File;
  bucket: string;
  folder: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  result?: any;
  error?: string;
}

export default function TestUpload() {
  const [tests, setTests] = useState<UploadTest[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [bucket, setBucket] = useState("videos");
  const [folder, setFolder] = useState("test-uploads");

  const handleFileSelection = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    
    // Criar testes para cada arquivo
    const newTests: UploadTest[] = fileArray.map((file, index) => ({
      id: `test-${Date.now()}-${index}`,
      file,
      bucket,
      folder,
      status: "pending",
      progress: 0
    }));
    
    setTests(newTests);
  };

  const runUploadTest = async (testId: string) => {
    const testIndex = tests.findIndex(t => t.id === testId);
    if (testIndex === -1) return;

    const test = tests[testIndex];
    
    // Atualizar status para uploading
    setTests(prev => prev.map(t => 
      t.id === testId 
        ? { ...t, status: "uploading", progress: 10 }
        : t
    ));

    try {
      // 1. Verificar/criar bucket
      console.log(`🪣 Verificando bucket: ${test.bucket}`);
      const bucketResult = await ensureBucketExists(test.bucket, test.bucket === "covers");
      
      if (!bucketResult.success) {
        throw new Error(`Erro no bucket: ${bucketResult.error}`);
      }

      setTests(prev => prev.map(t => 
        t.id === testId ? { ...t, progress: 30 } : t
      ));

      // 2. Configurar opções de upload
      const uploadOptions: UploadOptions = {
        bucket: test.bucket,
        folder: test.folder,
        cacheControl: "3600",
        upsert: false,
        maxSize: 100 * 1024 * 1024 // 100MB para teste
      };

      setTests(prev => prev.map(t => 
        t.id === testId ? { ...t, progress: 50 } : t
      ));

      // 3. Executar upload
      console.log(`📤 Iniciando upload de: ${test.file.name}`);
      const result = await uploadFile(test.file, uploadOptions);

      setTests(prev => prev.map(t => 
        t.id === testId ? { ...t, progress: 90 } : t
      ));

      if (!result.success) {
        throw new Error(result.error || "Erro desconhecido no upload");
      }

      // 4. Sucesso
      setTests(prev => prev.map(t => 
        t.id === testId 
          ? { 
              ...t, 
              status: "success", 
              progress: 100, 
              result: result.data 
            }
          : t
      ));

      toast.success(`Upload concluído: ${test.file.name}`);

    } catch (error: any) {
      console.error("❌ Erro no teste de upload:", error);
      
      setTests(prev => prev.map(t => 
        t.id === testId 
          ? { 
              ...t, 
              status: "error", 
              progress: 0, 
              error: error.message 
            }
          : t
      ));

      toast.error(`Erro no upload: ${error.message}`);
    }
  };

  const runAllTests = async () => {
    for (const test of tests) {
      if (test.status === "pending") {
        await runUploadTest(test.id);
        // Pequena pausa entre uploads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const clearTests = () => {
    setTests([]);
    setSelectedFiles([]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return "⏳";
      case "uploading": return "📤";
      case "success": return "✅";
      case "error": return "❌";
      default: return "📄";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-400";
      case "uploading": return "text-blue-400";
      case "success": return "text-emerald-400";
      case "error": return "text-red-400";
      default: return "text-white";
    }
  };

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 Teste de Upload do Supabase</h1>

        {/* Configuração */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuração do Teste</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Bucket</label>
              <select
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="w-full bg-transparent border border-white/20 text-white rounded-md p-3"
              >
                <option className="text-black" value="videos">videos (privado)</option>
                <option className="text-black" value="covers">covers (público)</option>
                <option className="text-black" value="banners">banners (público)</option>
                <option className="text-black" value="thumbnails">thumbnails (público)</option>
                <option className="text-black" value="screenshots">screenshots (público)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Pasta</label>
              <Input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="ex: test-uploads"
                className="bg-transparent border-white/20 text-white"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setBucket("videos");
                  setFolder("test-uploads");
                }}
                variant="outline"
                className="border-white/20 text-white"
              >
                🔄 Reset
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Arquivos para Teste (múltiplos permitidos)
            </label>
            <Input
              type="file"
              multiple
              onChange={(e) => handleFileSelection(e.target.files)}
              className="bg-transparent border-white/20 text-white"
              accept="image/*,video/*,.mp4,.jpg,.jpeg,.png,.gif"
            />
            <div className="text-xs text-white/60 mt-1">
              Selecione arquivos pequenos ({"<"}10MB) para teste. Formatos: JPG, PNG, MP4, etc.
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-white/80 mb-2">
                Arquivos selecionados: {selectedFiles.length}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={runAllTests}
                  className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
                  disabled={tests.some(t => t.status === "uploading")}
                >
                  🚀 Testar Todos os Uploads
                </Button>
                <Button
                  onClick={clearTests}
                  variant="outline"
                  className="border-white/20 text-white"
                >
                  ��️ Limpar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Resultados dos Testes */}
        {tests.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Resultados dos Testes</h2>
            
            <div className="space-y-4">
              {tests.map((test) => (
                <div key={test.id} className="border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getStatusIcon(test.status)}</span>
                      <div>
                        <div className="font-medium">{test.file.name}</div>
                        <div className="text-xs text-white/60">
                          {(test.file.size / 1024).toFixed(2)} KB → {test.bucket}/{test.folder}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getStatusColor(test.status)}`}>
                        {test.status.toUpperCase()}
                      </div>
                      {test.status === "uploading" && (
                        <div className="text-xs text-white/60">
                          {test.progress}%
                        </div>
                      )}
                    </div>
                  </div>

                  {test.status === "uploading" && (
                    <Progress value={test.progress} className="h-2 bg-white/10 mb-2" />
                  )}

                  {test.status === "success" && test.result && (
                    <div className="bg-emerald-500/10 p-3 rounded-lg mt-2">
                      <div className="text-emerald-400 text-sm font-medium mb-1">
                        ✅ Upload realizado com sucesso!
                      </div>
                      <div className="text-xs text-white/70 space-y-1">
                        <div><strong>Caminho:</strong> {test.result.path}</div>
                        <div><strong>URL:</strong> 
                          <a 
                            href={test.result.publicUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-blue-400 hover:text-blue-300 ml-1"
                          >
                            {test.result.publicUrl}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {test.status === "error" && test.error && (
                    <div className="bg-red-500/10 p-3 rounded-lg mt-2">
                      <div className="text-red-400 text-sm font-medium mb-1">
                        ❌ Erro no upload
                      </div>
                      <div className="text-xs text-white/70">
                        {test.error}
                      </div>
                    </div>
                  )}

                  {test.status === "pending" && (
                    <Button
                      onClick={() => runUploadTest(test.id)}
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-500/90 text-white mt-2"
                    >
                      ▶️ Executar Teste
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informações e Links */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-400 mb-3">
            📖 Sobre este Teste
          </h3>
          <div className="text-sm text-white/80 space-y-2">
            <p>
              Este teste segue as <strong>melhores práticas do Supabase</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Verifica se o bucket existe antes do upload</li>
              <li>Gera nomes de arquivo seguros (sem caracteres especiais)</li>
              <li>Adiciona timestamp e hash para evitar conflitos</li>
              <li>Valida tamanho máximo do arquivo</li>
              <li>Trata erros específicos com mensagens claras</li>
              <li>Gera URLs públicas automaticamente</li>
            </ul>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => window.location.href = "/supabase-diagnostic"}
              variant="outline"
              className="border-purple-500 text-purple-400"
            >
              🔧 Diagnóstico Completo
            </Button>
            <Button
              onClick={() => window.location.href = "/creator"}
              variant="outline"
              className="border-emerald-500 text-emerald-400"
            >
              👤 Área do Criador
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
