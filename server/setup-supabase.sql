-- Esquema do banco Cinexnema
-- Execute este script no SQL Editor do seu projeto Supabase

-- Tabela de vídeos dos criadores
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  formato text CHECK (formato IN ('Filme', 'Série', 'Seriado')),
  generos text[] DEFAULT '{}',
  projeto_id uuid REFERENCES projects(id),
  video_url text, -- URL do vídeo no Supabase Storage
  capa_url text,  -- URL da capa no Supabase Storage
  bucket text DEFAULT 'videos',
  video_path text, -- caminho no storage
  capa_path text,  -- caminho da capa no storage
  duracao_minutos integer,
  custo_mensal numeric DEFAULT 0,
  aprovado boolean DEFAULT false,
  status text DEFAULT 'uploaded',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de projetos (séries/seriados)
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabela de ganhos/receitas (para o dashboard)
CREATE TABLE IF NOT EXISTS earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  receita_total numeric DEFAULT 0,
  comissao_criador numeric DEFAULT 0,
  comissao_plataforma numeric DEFAULT 0,
  mes_ref date NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_videos_creator_id ON videos(creator_id);
CREATE INDEX IF NOT EXISTS idx_videos_aprovado ON videos(aprovado);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_earnings_creator_id ON earnings(creator_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para videos
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

-- Políticas de segurança para projects
DROP POLICY IF EXISTS "Criadores podem gerenciar seus projetos" ON projects;
CREATE POLICY "Criadores podem gerenciar seus projetos" ON projects
  FOR ALL USING (auth.uid() = owner_id);

-- Políticas de segurança para earnings
DROP POLICY IF EXISTS "Criadores podem ver seus ganhos" ON earnings;
CREATE POLICY "Criadores podem ver seus ganhos" ON earnings
  FOR SELECT USING (auth.uid() = creator_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage buckets (execute estas após criar os buckets no painel)
-- 1. Criar buckets: 'videos' e 'covers' 
-- 2. Configurar políticas de acesso nos buckets

-- Política para bucket 'videos' (criadores podem upload)
-- INSERT INTO storage.policies (bucket_id, name, definition) 
-- VALUES ('videos', 'Criadores podem fazer upload', '(bucket_id = ''videos'') AND (auth.uid()::text = (storage.foldername(name))[1])');

-- Política para bucket 'covers' (criadores podem upload, público pode ler)
-- INSERT INTO storage.policies (bucket_id, name, definition) 
-- VALUES ('covers', 'Criadores podem fazer upload de capas', '(bucket_id = ''covers'') AND (auth.uid()::text = (storage.foldername(name))[1])');

-- INSERT INTO storage.policies (bucket_id, name, definition) 
-- VALUES ('covers', 'Capas são públicas', '(bucket_id = ''covers'')');
