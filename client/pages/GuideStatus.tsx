import React from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function GuideStatus() {
  const tools = [
    {
      name: "🔍 Diagnóstico de Auth",
      path: "/diagnostic-auth",
      description: "Verifica configuração de autenticação do Supabase",
      status: !!supabase ? "ok" : "error",
      color: "blue"
    },
    {
      name: "🔧 Diagnóstico Storage",
      path: "/supabase-diagnostic",
      description: "Verifica buckets, permissões e configuração completa",
      status: !!supabase ? "ok" : "error",
      color: "purple"
    },
    {
      name: "🧪 Teste de Upload",
      path: "/test-upload",
      description: "Testa upload de arquivos seguindo melhores práticas",
      status: !!supabase ? "ok" : "error",
      color: "green"
    },
    {
      name: "⚙️ Setup Geral",
      path: "/setup",
      description: "Configuração inicial do banco de dados",
      status: "info",
      color: "amber"
    },
    {
      name: "👤 Área do Criador",
      path: "/creator",
      description: "Login e upload rápido de vídeos",
      status: "info",
      color: "emerald"
    },
    {
      name: "📋 Upload Completo",
      path: "/upload-complete",
      description: "Formulário completo com metadados detalhados",
      status: "info",
      color: "emerald"
    },
    {
      name: "📂 Meus Conteúdos",
      path: "/content",
      description: "Lista e gerenciamento de conteúdos por criador",
      status: "info",
      color: "blue"
    },
    {
      name: "⚖️ Área Admin",
      path: "/admin",
      description: "Aprovação e moderação de conteúdos",
      status: "info",
      color: "red"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok": return "✅";
      case "error": return "❌";
      case "warning": return "⚠️";
      default: return "ℹ️";
    }
  };

  const getStatusColor = (color: string) => {
    const colors = {
      blue: "border-blue-500 text-blue-400",
      purple: "border-purple-500 text-purple-400",
      green: "border-green-500 text-green-400",
      amber: "border-amber-500 text-amber-400",
      emerald: "border-emerald-500 text-emerald-400",
      red: "border-red-500 text-red-400"
    };
    return colors[color] || "border-gray-500 text-gray-400";
  };

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📚 Guia da Plataforma Cinexnema</h1>
        
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Status da Configuração</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>{supabase ? "✅" : "❌"}</span>
                <span>Supabase Client</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{import.meta.env.VITE_SUPABASE_URL ? "✅" : "❌"}</span>
                <span>URL Configurada</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{import.meta.env.VITE_SUPABASE_ANON_KEY ? "✅" : "❌"}</span>
                <span>Chave Configurada</span>
              </div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
              <h3 className="font-semibold text-blue-400 mb-2">🎯 Próximos Passos</h3>
              <ol className="text-sm text-white/80 space-y-1 list-decimal list-inside">
                <li>Execute o Setup Geral para criar tabelas</li>
                <li>Use Diagnóstico Storage para verificar buckets</li>
                <li>Teste Upload para validar funcionamento</li>
                <li>Acesse Área do Criador para começar</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {tools.map((tool) => (
            <div key={tool.path} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold mb-1">{tool.name}</h3>
                  <p className="text-sm text-white/70">{tool.description}</p>
                </div>
                <span className="text-lg">{getStatusIcon(tool.status)}</span>
              </div>
              
              <Button
                onClick={() => window.location.href = tool.path}
                variant="outline"
                className={`w-full ${getStatusColor(tool.color)}`}
                size="sm"
              >
                Acessar
              </Button>
            </div>
          ))}
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-emerald-400 mb-4">🚀 Funcionalidades Implementadas</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-white/80">
            <div>
              <h4 className="font-semibold text-white mb-2">✅ Sistema de Upload</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Upload para Supabase Storage</li>
                <li>Buckets automáticos (videos, covers, etc)</li>
                <li>Nomes de arquivo seguros</li>
                <li>Validação de tamanho</li>
                <li>URLs públicas automáticas</li>
                <li>Tratamento robusto de erros</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-2">✅ Autenticação</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Login/criação automática de conta</li>
                <li>Controle de sessão</li>
                <li>Autorização por criador</li>
                <li>Políticas RLS no Supabase</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">✅ Formulários</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Upload rápido (essencial)</li>
                <li>Upload completo (4 etapas)</li>
                <li>Metadados detalhados</li>
                <li>Cálculo de custos</li>
                <li>Preview de arquivos</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">✅ Gerenciamento</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Dashboard do criador</li>
                <li>Lista de conteúdos</li>
                <li>Sistema de aprovação</li>
                <li>Estatísticas</li>
                <li>Filtros e busca</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6">
          <h3 className="font-semibold text-amber-400 mb-4">📖 Melhores Práticas Implementadas</h3>
          
          <div className="text-sm text-white/80 space-y-3">
            <div>
              <h4 className="font-semibold text-white">🔧 Configuração Supabase:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Verificação automática de buckets</li>
                <li>Criação automática se não existir</li>
                <li>Políticas RLS para segurança</li>
                <li>Buckets públicos/privados apropriados</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white">📤 Upload de Arquivos:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Nomes seguros (sem caracteres especiais)</li>
                <li>Timestamp + hash para evitar conflitos</li>
                <li>Validação de tamanho antes do upload</li>
                <li>Mensagens de erro específicas e claras</li>
                <li>Progress tracking em tempo real</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white">🛡️ Segurança:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Autenticação obrigatória para uploads</li>
                <li>Isolamento por usuário (RLS)</li>
                <li>Validação no cliente e servidor</li>
                <li>Logs detalhados para debugging</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
