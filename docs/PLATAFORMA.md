# Cinexnema • Guia da Plataforma

Este arquivo centraliza informações operacionais, rotas, integrações e design para incorporar este módulo de upload em outros projetos.

## Branding e UI

- Paleta (HSL via CSS vars em `client/global.css`):
  - Background: `--background: 230 30% 8%`
  - Primária (verde): `--primary: 164 86% 45%`
  - Acento (ciano): `--accent: 189 94% 43%`
  - Texto: `--foreground: 210 40% 98%`
  - Bordas: `--border: 230 23% 20%`
- Framework: React 18 + Vite + Tailwind. UI com classes utilitárias e componentes em `client/components/ui`.
- Layout compartilhado: `client/App.tsx` (header + footer). Título da home: “Cinexnema Upload videos”.

## Páginas relevantes

- Página principal de upload (pública): `client/pages/Index.tsx`
- Área do Criador (login Supabase + uploads + dashboard simples): `client/pages/Creator.tsx`
- Upload completo com formulário e calculadora de blocos: `client/pages/criadores/UploadFilme.tsx`

## Regras de negócio (upload e cobrança)

- Upload de vídeo com Mux (tus) e capa em Supabase Storage
- Calculadora de blocos: até 70 min é grátis; cada bloco adicional de 70 min custa R$ 1000/mês
- Os campos obrigatórios no formulário (UploadFilme) incluem:
  - Título, Descrição, Biografia do criador
  - Formato (Filme, Série, Seriado)
  - Gêneros (múltipla seleção)
  - Projeto (para Série/Seriado): seleciona existente do usuário ou cria um novo
  - Capa (imagem) e Arquivo de vídeo
  - Duração (minutos) para cálculo de custo

## Integrações

### Mux

- Env vars: `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`
- Fluxo:
  1. POST `/api/creators/upload` cria URL de upload (tus) e registra linha “pending” na tabela `videos`
  2. Cliente envia o arquivo para a URL (tus)
  3. POST `/api/creators/upload-complete` confirma, atualiza `mux_asset_id`, `playback_id` e `status`
- Player/thumbnail: `https://player.mux.com/<playback_id>` e `https://image.mux.com/<playback_id>/thumbnail.webp?time=1`

### Supabase

- Env vars (frontend): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Env vars (server): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_COVERS_BUCKET` (padrão: `covers`)
- Autenticação de criadores (email/senha) na página `Creator.tsx`
- Storage (capa): POST `/api/creators/cover`
- Dados do criador e vídeos: via tabelas abaixo

## Backend (Express)

Arquivo principal: `server/index.ts`
Rotas:

- Públicos gerais: `/api/videos/public` (galeria de aprovados)
- Criadores (com bearer token Supabase):
  - `POST /api/creators/cover` (multipart) – envia capa ao Storage
  - `POST /api/creators/upload` – cria upload Mux e linha em `videos`
  - `POST /api/creators/upload-complete` – confirma upload e atualiza `videos`
  - `GET  /api/creators/videos` – lista vídeos do criador autenticado
  - `DELETE /api/creators/video/:id` – remove vídeo do criador
  - `GET /api/creators/dashboard` – métricas/ganhos (acumuladores)

Implementação:

- Supabase helper: `server/supabase.ts`
- Rotas de criadores: `server/routes/creators.ts`
- Rotas públicas/demo: `server/routes/videos.ts`

## Esquema de Banco (Supabase)

Tabelas sugeridas (SQL) – executar no Supabase:

```sql
-- Vídeos
create table if not exists videos (
  id text primary key,             -- usa o upload_id do Mux
  creator_id uuid not null,
  mux_asset_id text,
  playback_id text,
  titulo text,
  descricao text,
  tags text[] default '{}',        -- inclui formato, gêneros e opcional "projeto:<nome>"
  capa_url text,
  status text default 'pending_upload',
  created_at timestamp with time zone default now()
);

-- Projetos (séries/seriados)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  nome text not null,
  created_at timestamp with time zone default now()
);

-- Ganhos (acúmulo mensal)
create table if not exists earnings (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null,
  video_id text,
  receita_total numeric default 0,
  comissao_criador numeric default 0,
  comissao_plataforma numeric default 0,
  mes_ref date not null
);
```

RLS (exemplo mínimo):

```sql
alter table videos enable row level security;
create policy "owner can read own videos" on videos for select using (auth.uid() = creator_id);
create policy "owner can manage own videos" on videos for all using (auth.uid() = creator_id);

alter table projects enable row level security;
create policy "owner projects" on projects for all using (auth.uid() = owner_id);

alter table earnings enable row level security;
create policy "owner earnings" on earnings for select using (auth.uid() = creator_id);
```

Buckets de Storage:

- `covers` (público) para imagens de capa

## Fluxo de Upload (Cliente)

Arquivo: `client/pages/criadores/UploadFilme.tsx`

1. Usuário autentica (Supabase)
2. Preenche formulário e escolhe capa/vídeo
3. Cálculo automático de custo por blocos (>= 70 min)
4. Envia capa via `/api/creators/cover`
5. Cria upload via `/api/creators/upload` (envia título, descrição+bio, tags: formato/gêneros/projeto)
6. Envia vídeo usando tus para `uploadUrl`
7. Confirma via `/api/creators/upload-complete`

## Rotas do SPA

- `/` – Home de upload simplificado
- `/creator` – Login/Área do Criador
- `/criadores/upload` – Upload completo (form + calculadora)

## Observações de incorporação

- O módulo é independente; basta expor as rotas de backend citadas e as env vars
- Para incorporar somente a página de upload, use `UploadFilme.tsx` e configure Supabase/Mux
- Player de exemplo incluso na lateral (substituir pelo `playback_id` do ativo real)

## Exemplo de Player

```html
<iframe
  src="https://player.mux.com/<PLAYBACK_ID>"
  style="width: 100%; height: 100%; border: none;"
  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
  allowfullscreen
></iframe>
```
