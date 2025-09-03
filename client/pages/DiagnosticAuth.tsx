import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function DiagnosticAuth() {
  const [status, setStatus] = useState<any>({});

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    const diagnostics = {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? "✓ Definida" : "✗ Não definida",
      supabaseClient: !!supabase ? "✓ Conectado" : "✗ Não conectado",
      timestamp: new Date().toISOString()
    };

    if (supabase) {
      try {
        // Testar conexão com Supabase
        const { data, error } = await supabase.auth.getSession();
        diagnostics.sessionTest = error ? `✗ Erro: ${error.message}` : "✓ Conectado ao Auth";
      } catch (err: any) {
        diagnostics.sessionTest = `✗ Erro de conexão: ${err.message}`;
      }
    }

    setStatus(diagnostics);
  }

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Diagnóstico de Autenticação</h1>
        
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Status da Configuração</h2>
          
          <div className="space-y-2 text-sm">
            <div><strong>URL Supabase:</strong> {status.supabaseUrl || "Não definida"}</div>
            <div><strong>Anon Key:</strong> {status.supabaseAnonKey}</div>
            <div><strong>Cliente:</strong> {status.supabaseClient}</div>
            <div><strong>Teste de Sessão:</strong> {status.sessionTest}</div>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => window.location.href = "/test-auth"}
            className="w-full bg-emerald-500 hover:bg-emerald-500/90 text-black"
          >
            🧪 Teste Completo de Auth
          </Button>
          
          <Button
            onClick={() => window.location.href = "/creator"}
            variant="outline"
            className="w-full border-white/20 text-white"
          >
            ← Voltar para /creator
          </Button>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-blue-400 mb-2">Para resolver problemas de login:</h3>
          <ol className="text-sm text-white/80 space-y-1 list-decimal list-inside">
            <li>Vá no painel do Supabase → Authentication → Settings</li>
            <li>Certifique-se que "Enable email confirmations" está DESABILITADO</li>
            <li>Em "Site URL" coloque: http://localhost:8080</li>
            <li>Em "Redirect URLs" adicione: http://localhost:8080/creator</li>
            <li>Clique em "🧪 Teste Completo de Auth" para testar</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
