import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Setup() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    checkConfig();
  }, []);

  async function checkConfig() {
    try {
      const res = await fetch("/api/videos/config");
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error("Erro ao verificar configuração:", error);
    }
  }

  async function setupDatabase() {
    setLoading(true);
    try {
      const res = await fetch("/api/setup/database", {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Banco configurado com sucesso!");
        await checkConfig();
      } else {
        toast.error(data.error || "Erro ao configurar banco");
        console.error("Erro de setup:", data);
      }
    } catch (error: any) {
      toast.error("Erro ao configurar banco de dados");
      console.error("Erro de setup:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!config) {
    return (
      <div className="min-h-screen grid place-items-center text-white">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Verificando configuração...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <section className="container mx-auto px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-8 text-center">
            Configuração do Sistema
          </h1>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              Status da Configuração
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Supabase Conectado</span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    config.supabaseConfigured
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {config.supabaseConfigured
                    ? "✓ Conectado"
                    : "✗ Não configurado"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Tabelas do Banco</span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    config.tablesConfigured
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {config.tablesConfigured
                    ? "✓ Configuradas"
                    : "⚠ Não criadas"}
                </span>
              </div>
            </div>
          </div>

          {!config.tablesConfigured && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-amber-400 mb-2">
                ⚠ Configuração Necessária
              </h3>
              <p className="text-white/80 mb-4">
                As tabelas do banco de dados ainda não foram criadas. Clique no
                botão abaixo para configurar automaticamente.
              </p>

              <Button
                onClick={setupDatabase}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-500/90 text-black font-semibold"
              >
                {loading ? "Configurando..." : "Configurar Banco de Dados"}
              </Button>
            </div>
          )}

          {config.tablesConfigured && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                ✅ Sistema Configurado
              </h3>
              <p className="text-white/80 mb-4">
                Tudo está funcionando corretamente! Você pode começar a usar a
                plataforma.
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={() => (window.location.href = "/")}
                  className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
                >
                  Ir para Upload
                </Button>
                <Button
                  onClick={() => (window.location.href = "/creator")}
                  variant="outline"
                  className="border-white/20 text-white"
                >
                  Área do Criador
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">
              Configuração Manual (Alternativa)
            </h3>
            <p className="text-white/70 text-sm mb-3">
              Se a configuração automática não funcionar, você pode executar o
              script SQL manualmente:
            </p>
            <ol className="text-white/80 text-sm space-y-1 list-decimal list-inside">
              <li>Acesse seu painel do Supabase</li>
              <li>Vá em "SQL Editor"</li>
              <li>
                Execute o conteúdo do arquivo{" "}
                <code className="bg-white/10 px-1 rounded">
                  server/setup-supabase.sql
                </code>
              </li>
              <li>Clique em "Atualizar" para verificar novamente</li>
            </ol>

            <Button
              onClick={checkConfig}
              variant="outline"
              className="border-white/20 text-white mt-4"
            >
              Verificar Novamente
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
