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

  async function testConnection() {
    setLoading(true);
    setResult(null);
    
    try {
      // Teste 1: Verificar se supabase está funcionando
      console.log("1. Testando conexão Supabase...");
      if (!supabase) {
        throw new Error("Supabase não configurado");
      }
      
      // Teste 2: Tentar criar conta
      console.log("2. Tentando criar conta...");
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signUpError) {
        console.log("Erro ao criar conta:", signUpError);
        if (signUpError.message.includes("already registered")) {
          console.log("Conta já existe, tentando fazer login...");
        } else {
          setResult({ error: "Erro ao criar conta", details: signUpError });
          return;
        }
      } else {
        console.log("Conta criada:", signUpData);
        toast.success("Conta criada com sucesso!");
      }
      
      // Teste 3: Tentar fazer login
      console.log("3. Tentando fazer login...");
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        console.log("Erro ao fazer login:", signInError);
        setResult({ error: "Erro ao fazer login", details: signInError });
        toast.error(signInError.message);
        return;
      }
      
      console.log("Login bem-sucedido:", signInData);
      setResult({ success: true, user: signInData.user, session: signInData.session });
      toast.success("Login realizado com sucesso!");
      
      // Teste 4: Verificar sessão atual
      const { data: session } = await supabase.auth.getSession();
      console.log("Sessão atual:", session);
      
    } catch (error: any) {
      console.error("Erro geral:", error);
      setResult({ error: "Erro geral", details: error });
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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Teste de Autenticação</h1>
        
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Credenciais</h2>
          
          <div className="space-y-4">
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
            
            <div className="flex gap-2">
              <Button
                onClick={testConnection}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
              >
                {loading ? "Testando..." : "Testar Login"}
              </Button>
              
              <Button
                onClick={testSignOut}
                variant="outline"
                className="border-white/20 text-white"
              >
                Logout
              </Button>
              
              <Button
                onClick={() => window.location.href = "/creator"}
                variant="outline"
                className="border-white/20 text-white"
              >
                Ir para /creator
              </Button>
            </div>
          </div>
        </div>

        {result && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Resultado</h2>
            <pre className="text-sm bg-black/30 p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-amber-400 mb-2">Instruções:</h3>
          <ol className="text-sm text-white/80 space-y-1 list-decimal list-inside">
            <li>Clique em "Testar Login" para criar conta e fazer login automaticamente</li>
            <li>Verifique o console do browser (F12) para logs detalhados</li>
            <li>Se der erro, verifique as configurações do Supabase Auth</li>
            <li>Certifique-se que Email confirmations está desabilitado (para teste)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
