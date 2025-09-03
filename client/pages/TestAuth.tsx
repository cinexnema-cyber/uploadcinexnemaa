import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function TestAuth() {
  const [email, setEmail] = useState("centralcomercialec@gmail.com");
  const [password, setPassword] = useState("I30C77T$IiD");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function testAuthFlow() {
    setLoading(true);
    setResult(null);

    try {
      if (!supabase) {
        throw new Error("Supabase não configurado");
      }

      console.log("🔧 Iniciando teste completo de autenticação");
      const steps = [];

      // Etapa 1: Verificar configuração
      steps.push("✓ Supabase conectado");
      console.log("1. Supabase conectado:", !!supabase);

      // Etapa 2: Tentar login primeiro
      console.log("2. Tentando fazer login...");
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          steps.push("⚠ Login falhou - conta não existe");
          console.log("Login falhou, tentando criar conta...");

          // Etapa 3: Criar conta se não existir
          const { data: signUpData, error: signUpError } =
            await supabase.auth.signUp({
              email,
              password,
            });

          if (signUpError) {
            if (signUpError.message.includes("already registered")) {
              steps.push("❌ Conta existe mas senha incorreta");
              throw new Error(
                "Conta já registrada, mas senha pode estar incorreta",
              );
            } else {
              steps.push("❌ Erro ao criar conta");
              throw new Error("Erro ao criar conta: " + signUpError.message);
            }
          }

          steps.push("✓ Conta criada com sucesso");
          console.log("Conta criada:", signUpData);

          // Se a conta foi criada mas não logou automaticamente
          if (signUpData.user && !signUpData.session) {
            steps.push("⚠ Confirmação de email necessária");
            setResult({
              success: false,
              steps,
              message:
                "Conta criada, mas confirmação de email é necessária. Verifique as configurações do Supabase Auth.",
              recommendation:
                "Desabilite 'Enable email confirmations' no painel do Supabase",
            });
            toast.error("Confirmação de email necess��ria");
            return;
          }

          // Se logou automaticamente após criar
          if (signUpData.session) {
            steps.push("✓ Login automático após criação");
            setResult({
              success: true,
              steps,
              user: signUpData.user,
              session: signUpData.session,
              message: "Conta criada e login realizado automaticamente!",
            });
            toast.success("✅ Sucesso! Conta criada e logada!");
            return;
          }

          // Tentar login manual após criar conta
          console.log("Tentando login após criar conta...");
          const { data: retryData, error: retryError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (retryError) {
            steps.push("❌ Login falhou após criar conta");
            throw new Error(
              "Login falhou após criar conta: " + retryError.message,
            );
          }

          steps.push("✓ Login realizado após criação");
          setResult({
            success: true,
            steps,
            user: retryData.user,
            session: retryData.session,
            message: "Conta criada e login realizado com sucesso!",
          });
          toast.success("✅ Sucesso! Conta criada e logada!");
        } else {
          steps.push("❌ Erro no login: " + signInError.message);
          throw new Error("Erro no login: " + signInError.message);
        }
      } else {
        // Login bem-sucedido na primeira tentativa
        steps.push("✓ Login realizado com sucesso");
        setResult({
          success: true,
          steps,
          user: signInData.user,
          session: signInData.session,
          message: "Login realizado com sucesso na primeira tentativa!",
        });
        toast.success("✅ Sucesso! Login realizado!");
      }
    } catch (error: any) {
      console.error("Erro no teste:", error);
      setResult({
        success: false,
        steps: result?.steps || [],
        error: error.message,
        recommendation:
          "Verifique as configurações do Supabase Auth ou as credenciais",
      });
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function testSignOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logout realizado");
      setResult(null);
    }
  }

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          🧪 Teste Completo de Autenticação
        </h1>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Credenciais para Teste</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border-white/20 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent border-white/20 text-white"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={testAuthFlow}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
            >
              {loading ? "Testando..." : "🚀 Testar Fluxo Completo"}
            </Button>

            <Button
              onClick={testSignOut}
              variant="outline"
              className="border-white/20 text-white"
            >
              🚪 Logout
            </Button>

            <Button
              onClick={() => (window.location.href = "/creator")}
              variant="outline"
              className="border-emerald-500 text-emerald-400"
            >
              👤 Ir para /creator
            </Button>

            <Button
              onClick={() => (window.location.href = "/diagnostic-auth")}
              variant="outline"
              className="border-blue-500 text-blue-400"
            >
              🔍 Diagnóstico
            </Button>
          </div>
        </div>

        {result && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {result.success
                ? "✅ Resultado - Sucesso!"
                : "❌ Resultado - Erro"}
            </h2>

            {result.steps && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Etapas do processo:</h3>
                <ul className="space-y-1 text-sm">
                  {result.steps.map((step: string, index: number) => (
                    <li key={index} className="text-white/80">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.message && (
              <div
                className={`p-3 rounded-lg mb-4 ${
                  result.success
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-red-500/10 text-red-300"
                }`}
              >
                <strong>{result.message}</strong>
              </div>
            )}

            {result.recommendation && (
              <div className="bg-amber-500/10 text-amber-300 p-3 rounded-lg mb-4">
                <strong>Recomendação:</strong> {result.recommendation}
              </div>
            )}

            {result.success && result.user && (
              <details className="text-sm">
                <summary className="cursor-pointer text-white/70 hover:text-white">
                  Ver dados do usuário
                </summary>
                <pre className="mt-2 p-3 bg-black/30 rounded overflow-auto text-xs">
                  {JSON.stringify(
                    { user: result.user, session_exists: !!result.session },
                    null,
                    2,
                  )}
                </pre>
              </details>
            )}

            {!result.success && result.error && (
              <details className="text-sm">
                <summary className="cursor-pointer text-red-400 hover:text-red-300">
                  Ver detalhes do erro
                </summary>
                <pre className="mt-2 p-3 bg-red-900/20 rounded overflow-auto text-xs text-red-300">
                  {result.error}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
          <h3 className="font-semibold text-blue-400 mb-3">
            💡 Como funciona este teste:
          </h3>
          <ol className="text-sm text-white/80 space-y-2 list-decimal list-inside">
            <li>
              <strong>Tenta fazer login</strong> com as credenciais fornecidas
            </li>
            <li>
              <strong>Se falhar</strong> (conta não existe), tenta criar a conta
              automaticamente
            </li>
            <li>
              <strong>Após criar</strong>, tenta fazer login novamente
            </li>
            <li>
              <strong>Mostra o resultado</strong> de cada etapa do processo
            </li>
          </ol>

          <div className="mt-4 p-3 bg-amber-500/10 rounded text-amber-300 text-sm">
            <strong>⚠️ Se der erro de confirmação de email:</strong>
            <br />
            Vá no painel do Supabase → Authentication → Settings → Desabilite
            "Enable email confirmations"
          </div>
        </div>
      </div>
    </div>
  );
}
