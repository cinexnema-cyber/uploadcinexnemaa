import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface VideoRow {
  id: string;
  titulo: string;
  descricao: string | null;
  capa_url: string | null;
  video_url: string | null;
  status: string;
  aprovado: boolean;
  created_at: string;
  formato: string | null;
  generos: string[] | null;
  duracao_minutos: number | null;
  custo_mensal: number;
}

export default function Creator() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s),
    );
    return () => sub?.subscription?.unsubscribe();
  }, []);

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen grid place-items-center text-white">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-3xl font-extrabold">Área do Criador</h1>
          <p className="text-white/70 text-sm">
            Conecte o Supabase para habilitar login e recursos do criador.
          </p>
          <p className="text-white/60 text-xs">
            Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
          </p>
        </div>
      </div>
    );
  }

  return session ? <Dashboard /> : <Auth />;
}

function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) toast.error(error.message);
      else toast.success("Conta criada. Verifique seu email e faça login.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    }
    
    setLoading(false);
  }

  return (
    <div className="min-h-screen grid place-items-center text-white">
      <form
        onSubmit={handleAuth}
        className="w-full max-w-sm space-y-3 border border-white/10 bg-white/5 p-6 rounded-xl"
      >
        <h1 className="text-xl font-semibold">
          {isSignUp ? "Criar Conta" : "Área do Criador"}
        </h1>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-transparent border-white/20 text-white"
          required
        />
        <Input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-transparent border-white/20 text-white"
          required
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
            disabled={loading}
          >
            {loading ? "..." : isSignUp ? "Criar conta" : "Entrar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-white/20 text-white"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={loading}
          >
            {isSignUp ? "Fazer login" : "Criar conta"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Dashboard() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"Filme" | "Série" | "Seriado">("Filme");
  const [genres, setGenres] = useState<string[]>([]);
  const [duration, setDuration] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [items, setItems] = useState<VideoRow[]>([]);
  const [stats, setStats] = useState<any>({});

  const canSend = useMemo(() => !!video && !!title && !isUploading, [video, title, isUploading]);

  async function load() {
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const res = await fetch("/api/creators/videos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error(`Erro ao carregar vídeos: HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setItems(data.videos ?? []);
    } catch (error) {
      console.error("Erro ao carregar vídeos:", error);
    }
  }

  async function loadDashboard() {
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const res = await fetch("/api/creators/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats || {});
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    }
  }

  useEffect(() => {
    load();
    loadDashboard();
  }, []);

  async function uploadCoverNow() {
    if (!cover) return;
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const fd = new FormData();
      fd.append("file", cover);
      const res = await fetch("/api/creators/cover", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      
      if (!res.ok) {
        let errorMessage = "Erro ao enviar capa";
        try {
          const errorData = await res.json();
          errorMessage = errorData?.message || errorMessage;
        } catch {
          // Se falhar ao ler o JSON, usa a mensagem padrão
        }
        return toast.error(errorMessage);
      }
      
      const data = await res.json();
      setCoverUrl(data.url);
      toast.success("Capa enviada");
    } catch (error) {
      toast.error("Erro ao enviar capa");
    }
  }

  async function handleUpload() {
    if (!video || !title) return;
    setIsUploading(true);
    setProgress(0);

    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      
      // 1. Criar upload
      const createRes = await fetch("/api/creators/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titulo: title,
          descricao: description,
          formato: format,
          generos: genres,
          capaUrl: coverUrl,
          duracaoMinutos: parseInt(duration) || 0,
        }),
      });
      
      if (!createRes.ok) {
        let errorMessage = "Falha ao iniciar upload";
        try {
          const errorData = await createRes.json();
          errorMessage = errorData?.error || errorMessage;
        } catch {
          // Se falhar ao ler o JSON, usa a mensagem padrão
        }
        throw new Error(errorMessage);
      }
      
      const { uploadUrl, uploadToken, videoId } = await createRes.json();

      // 2. Upload direto via signed URL
      setProgress(50);
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: video,
        headers: {
          "Content-Type": video.type,
          "Authorization": `Bearer ${uploadToken}`,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Falha no upload do arquivo");
      }

      setProgress(90);

      // 3. Completar upload
      const completeRes = await fetch("/api/creators/upload-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoId }),
      });

      if (!completeRes.ok) {
        throw new Error("Falha ao completar upload");
      }

      setProgress(100);
      toast.success("Upload concluído!");
      
      // Reset form
      setTitle("");
      setDescription("");
      setFormat("Filme");
      setGenres([]);
      setDuration("");
      setCover(null);
      setCoverUrl(null);
      setVideo(null);
      setProgress(0);
      
      await load();
      await loadDashboard();
    } catch (e: any) {
      toast.error(e?.message || String(e));
    } finally {
      setIsUploading(false);
    }
  }

  function calculateCost(minutes: string) {
    const mins = parseInt(minutes) || 0;
    if (mins <= 70) return 0;
    const extraBlocks = Math.ceil((mins - 70) / 70);
    return extraBlocks * 1000;
  }

  const estimatedCost = calculateCost(duration);

  return (
    <div className="min-h-screen text-white">
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold">Área do Criador</h1>
            <p className="text-white/70">Gerencie seus conteúdos e uploads.</p>
          </div>
          <Button
            variant="outline"
            className="border-white/20 text-white"
            onClick={() => supabase?.auth.signOut()}
          >
            Sair
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-400">{stats.totalVideos || 0}</div>
            <div className="text-sm text-white/70">Total de Vídeos</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.videosAprovados || 0}</div>
            <div className="text-sm text-white/70">Aprovados</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-400">R$ {stats.custoMensalTotal || 0}</div>
            <div className="text-sm text-white/70">Custo Mensal</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">
              {((stats.videosAprovados || 0) / Math.max(stats.totalVideos || 1, 1) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-white/70">Taxa de Aprovação</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4">Novo Upload</h2>
            <div className="grid gap-4">
              <Input
                placeholder="Título do vídeo *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-transparent border-white/20 text-white"
                required
              />
              <textarea
                placeholder="Descrição"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-transparent border border-white/20 text-white rounded-md p-3 min-h-[80px] resize-none"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Formato</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full bg-transparent border border-white/20 text-white rounded-md p-3"
                  >
                    <option className="text-black" value="Filme">Filme</option>
                    <option className="text-black" value="Série">Série</option>
                    <option className="text-black" value="Seriado">Seriado</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Duração (minutos)</label>
                  <Input
                    type="number"
                    placeholder="Ex: 90"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="bg-transparent border-white/20 text-white"
                  />
                  {estimatedCost > 0 && (
                    <div className="text-xs text-amber-400 mt-1">
                      Custo estimado: R$ {estimatedCost}/mês
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-white/70 mb-2 block">Gêneros</label>
                <div className="flex flex-wrap gap-2">
                  {["Ação", "Terror", "Drama", "Comédia", "Ficção", "Documentário", "Romance"].map((g) => (
                    <label
                      key={g}
                      className="inline-flex items-center gap-2 text-sm bg-white/5 border border-white/10 rounded px-3 py-1"
                    >
                      <input
                        type="checkbox"
                        className="accent-emerald-500"
                        checked={genres.includes(g)}
                        onChange={(e) =>
                          setGenres((prev) =>
                            e.target.checked
                              ? [...prev, g]
                              : prev.filter((x) => x !== g),
                          )
                        }
                      />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCover(e.target.files?.[0] || null)}
                  className="bg-transparent border-white/20 text-white"
                />
                <Button
                  onClick={uploadCoverNow}
                  disabled={!cover}
                  className="bg-emerald-500 text-black"
                >
                  Enviar capa
                </Button>
                {coverUrl && (
                  <span className="text-xs text-emerald-300">✓ Capa pronta</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideo(e.target.files?.[0] || null)}
                  className="bg-transparent border-white/20 text-white"
                />
                {video && (
                  <span className="text-xs text-white/70 truncate max-w-[200px]">
                    {video.name}
                  </span>
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={!canSend}
                className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
              >
                {isUploading ? `Enviando ${progress}%` : "Enviar vídeo"}
              </Button>

              {isUploading && (
                <Progress value={progress} className="h-2 bg-white/10" />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4">Seus Vídeos</h2>
            <div className="grid gap-3 max-h-[600px] overflow-y-auto">
              {items.length === 0 && (
                <div className="text-white/60 text-sm">
                  Nenhum vídeo enviado.
                </div>
              )}
              {items.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-black/30"
                >
                  <div className="w-16 aspect-video bg-white/10 rounded overflow-hidden">
                    {v.capa_url ? (
                      <img
                        src={v.capa_url}
                        className="w-full h-full object-cover"
                        alt="Capa"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-white/40 text-xs">
                        {v.status}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{v.titulo}</div>
                    <div className="text-xs text-white/60 flex items-center gap-2">
                      <span>{new Date(v.created_at).toLocaleDateString()}</span>
                      {v.aprovado ? (
                        <span className="text-emerald-400">✓ Aprovado</span>
                      ) : (
                        <span className="text-amber-400">Pendente</span>
                      )}
                    </div>
                    {v.custo_mensal > 0 && (
                      <div className="text-xs text-amber-300">
                        R$ {v.custo_mensal}/mês
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white text-xs"
                    onClick={() => onDelete(v.id)}
                  >
                    Excluir
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  async function onDelete(id: string) {
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const res = await fetch(`/api/creators/video/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return toast.error("Erro ao excluir");
      toast.success("Vídeo excluído");
      await load();
      await loadDashboard();
    } catch (error) {
      toast.error("Erro ao excluir vídeo");
    }
  }
}
