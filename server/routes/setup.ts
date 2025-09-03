import type { RequestHandler } from "express";
import { getAdminClient } from "../supabase";

export const setupDatabase: RequestHandler = async (_req, res) => {
  const sb = getAdminClient();
  if (!sb) return res.status(400).json({ error: "SUPABASE_NOT_CONFIGURED" });

  try {
    // Criar extensões necessárias
    await sb.rpc('exec_sql', { 
      sql: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' 
    }).throwOnError();

    // Criar tabela de vídeos
    const { error: videosError } = await sb.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS videos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
          titulo text NOT NULL,
          descricao text,
          formato text CHECK (formato IN ('Filme', 'Série', 'Seriado')),
          generos text[] DEFAULT '{}',
          projeto_id uuid,
          video_url text,
          capa_url text,
          bucket text DEFAULT 'videos',
          video_path text,
          capa_path text,
          duracao_minutos integer,
          custo_mensal numeric DEFAULT 0,
          aprovado boolean DEFAULT false,
          status text DEFAULT 'uploaded',
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        );
      `
    });

    if (videosError) {
      console.error('Erro ao criar tabela videos:', videosError);
      return res.status(500).json({ error: 'Erro ao criar tabela videos', details: videosError.message });
    }

    // Criar tabela de projetos
    const { error: projectsError } = await sb.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS projects (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
          nome text NOT NULL,
          created_at timestamp with time zone DEFAULT now()
        );
      `
    });

    if (projectsError) {
      console.error('Erro ao criar tabela projects:', projectsError);
      return res.status(500).json({ error: 'Erro ao criar tabela projects', details: projectsError.message });
    }

    // Criar tabela de earnings
    const { error: earningsError } = await sb.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS earnings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
          video_id uuid,
          receita_total numeric DEFAULT 0,
          comissao_criador numeric DEFAULT 0,
          comissao_plataforma numeric DEFAULT 0,
          mes_ref date NOT NULL,
          created_at timestamp with time zone DEFAULT now()
        );
      `
    });

    if (earningsError) {
      console.error('Erro ao criar tabela earnings:', earningsError);
      return res.status(500).json({ error: 'Erro ao criar tabela earnings', details: earningsError.message });
    }

    // Habilitar RLS
    const { error: rlsError } = await sb.rpc('exec_sql', {
      sql: `
        ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
        ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
        ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;
      `
    });

    if (rlsError) {
      console.error('Erro ao habilitar RLS:', rlsError);
    }

    // Criar políticas básicas
    const { error: policiesError } = await sb.rpc('exec_sql', {
      sql: `
        -- Políticas para videos
        DROP POLICY IF EXISTS "Criadores podem ver seus próprios vídeos" ON videos;
        CREATE POLICY "Criadores podem ver seus próprios vídeos" ON videos
          FOR SELECT USING (auth.uid() = creator_id);

        DROP POLICY IF EXISTS "Criadores podem inserir seus vídeos" ON videos;
        CREATE POLICY "Criadores podem inserir seus vídeos" ON videos
          FOR INSERT WITH CHECK (auth.uid() = creator_id);

        DROP POLICY IF EXISTS "Criadores podem atualizar seus vídeos" ON videos;
        CREATE POLICY "Criadores podem atualizar seus vídeos" ON videos
          FOR UPDATE USING (auth.uid() = creator_id);

        DROP POLICY IF EXISTS "Criadores podem deletar seus vídeos" ON videos;
        CREATE POLICY "Criadores podem deletar seus vídeos" ON videos
          FOR DELETE USING (auth.uid() = creator_id);

        DROP POLICY IF EXISTS "Vídeos aprovados são públicos" ON videos;
        CREATE POLICY "Vídeos aprovados são públicos" ON videos
          FOR SELECT USING (aprovado = true);

        -- Políticas para projects
        DROP POLICY IF EXISTS "Criadores podem gerenciar seus projetos" ON projects;
        CREATE POLICY "Criadores podem gerenciar seus projetos" ON projects
          FOR ALL USING (auth.uid() = owner_id);

        -- Políticas para earnings
        DROP POLICY IF EXISTS "Criadores podem ver seus ganhos" ON earnings;
        CREATE POLICY "Criadores podem ver seus ganhos" ON earnings
          FOR SELECT USING (auth.uid() = creator_id);
      `
    });

    if (policiesError) {
      console.error('Erro ao criar políticas:', policiesError);
    }

    res.json({ 
      success: true, 
      message: 'Banco de dados configurado com sucesso!',
      tables_created: ['videos', 'projects', 'earnings']
    });
  } catch (error: any) {
    console.error('Erro ao configurar banco:', error);
    res.status(500).json({ 
      error: 'Erro ao configurar banco de dados', 
      details: error.message 
    });
  }
};
