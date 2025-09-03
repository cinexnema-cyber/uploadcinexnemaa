# Configuração do Supabase

Para que o sistema funcione corretamente, você precisa configurar o Supabase. Siga os passos abaixo:

## 1. Criar o Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova conta ou faça login
3. Clique em "New Project"
4. Configure nome, senha do banco e região
5. Aguarde a criação do projeto

## 2. Configurar as Tabelas

1. No painel do Supabase, vá em **SQL Editor**
2. Copie e cole o conteúdo do arquivo `server/setup-supabase.sql`
3. Execute o script clicando em "Run"

Isso criará as tabelas:
- `videos` - Armazena metadados dos vídeos
- `projects` - Projetos de séries/seriados dos criadores
- `earnings` - Controle de ganhos/receitas

## 3. Configurar Storage Buckets

1. Vá em **Storage** no painel do Supabase
2. Crie os seguintes buckets:

### Bucket "videos"
- Nome: `videos`
- Público: **NÃO** (apenas criadores podem acessar seus próprios vídeos)
- Policies:
  ```sql
  -- Criadores podem fazer upload nos seus próprios diretórios
  CREATE POLICY "Criadores podem upload videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
  
  -- Criadores podem ler seus próprios vídeos
  CREATE POLICY "Criadores podem ler seus videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
  
  -- Criadores podem deletar seus próprios vídeos
  CREATE POLICY "Criadores podem deletar seus videos" ON storage.objects
  FOR DELETE USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
  
  -- Vídeos aprovados são públicos para leitura
  CREATE POLICY "Videos aprovados sao publicos" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');
  ```

### Bucket "covers"
- Nome: `covers`
- Público: **SIM** (capas são públicas)
- Policies:
  ```sql
  -- Criadores podem fazer upload de capas
  CREATE POLICY "Criadores podem upload capas" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
  
  -- Capas são públicas para leitura
  CREATE POLICY "Capas sao publicas" ON storage.objects
  FOR SELECT USING (bucket_id = 'covers');
  
  -- Criadores podem deletar suas capas
  CREATE POLICY "Criadores podem deletar capas" ON storage.objects
  FOR DELETE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
  ```

## 4. Configurar Autenticação

1. Vá em **Authentication** > **Settings**
2. Em **Site URL**, configure: `http://localhost:8080` (desenvolvimento)
3. Em **Redirect URLs**, adicione: `http://localhost:8080/creator`
4. Habilite **Email confirmations** se desejar

## 5. Obter as Credenciais

1. Vá em **Settings** > **API**
2. Copie:
   - **Project URL** (ex: https://xyz.supabase.co)
   - **anon/public key** (chave pública)
   - **service_role key** (chave privada - mantenha em segredo)

## 6. Configurar Variáveis de Ambiente

As credenciais já foram configuradas via DevServerControl, mas para referência:

```env
# Cliente (frontend)
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_aqui

# Servidor (backend)
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_privada_aqui
SUPABASE_COVERS_BUCKET=covers
```

## 7. Testar a Configuração

1. Acesse a aplicaç��o
2. Vá em `/creator` e tente criar uma conta
3. Faça login e teste o upload de um vídeo
4. Verifique se os dados aparecem nas tabelas do Supabase

## Estrutura de Diretórios no Storage

```
videos/
  ├── {user_id}/
  │   ├── {timestamp}-video.mp4
  │   └── {timestamp}-video2.mp4
  └── ...

covers/
  ├── {user_id}/
  │   ├── {timestamp}-{random}.jpg
  │   └── {timestamp}-{random}.png
  └── ...
```

## Páginas do Sistema

- `/` - Upload público simplificado
- `/creator` - Área do criador (login + dashboard + upload completo)
- `/content` - Lista de conteúdos do criador (acesso restrito)
- `/admin` - Painel administrativo para aprovar vídeos

## Funcionalidades Implementadas

✅ Upload de vídeos para Supabase Storage
✅ Upload de capas
✅ Controle de autenticação por criador
✅ Dashboard com estatísticas
✅ Cálculo automático de custos por duração
✅ Sistema de aprovação de conteúdo
✅ Página de conteúdos com filtros
✅ Políticas de segurança (RLS)
