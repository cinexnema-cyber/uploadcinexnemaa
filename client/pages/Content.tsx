import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function Content() {
  const [session, setSession] = useState<any>(null);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s),
    );
    return () => sub?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadVideos();
    }
  }, [session]);

  useEffect(() => {
    // Aplicar filtros
    let filtered = videos;

    if (searchTerm) {
      filtered = filtered.filter(v => 
        v.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterFormat !== "all") {
      filtered = filtered.filter(v => v.formato === filterFormat);
    }

    if (filterStatus !== "all") {
      if (filterStatus === "aprovado") {
        filtered = filtered.filter(v => v.aprovado);
      } else if (filterStatus === "pendente") {
        filtered = filtered.filter(v => !v.aprovado);
      }
    }

    setFilteredVideos(filtered);
  }, [videos, searchTerm, filterFormat, filterStatus]);

  async function loadVideos() {
    try {
      setLoading(true);
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const res = await fetch("/api/creators/videos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error(`Erro ao carregar vídeos: HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setVideos(data.videos ?? []);
    } catch (error) {
      console.error("Erro ao carregar vídeos:", error);
      toast.error("Erro ao carregar conteúdos");
    } finally {
      setLoading(false);
    }
  }

  async function deleteVideo(id: string) {
    if (!confirm("Tem certeza que deseja excluir este vídeo?")) return;
    
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const res = await fetch(`/api/creators/video/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error("Erro ao excluir vídeo");
        return;
      }
      toast.success("Vídeo excluído com sucesso");
      await loadVideos();
    } catch (error) {
      toast.error("Erro ao excluir vídeo");
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen grid place-items-center text-white">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-3xl font-extrabold">Meus Conteúdos</h1>
          <p className="text-white/70 text-sm">
            Configure o Supabase para acessar seus conteúdos.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center text-white">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-3xl font-extrabold">Meus Conteúdos</h1>
          <p className="text-white/70 text-sm">
            Faça login para acessar seus conteúdos.
          </p>
          <Button
            onClick={() => window.location.href = "/creator"}
            className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
          >
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold">Meus Conteúdos</h1>
            <p className="text-white/70">Gerencie todos os seus vídeos publicados.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => window.location.href = "/creator"}
            >
              Nova Upload
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => supabase?.auth.signOut()}
            >
              Sair
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-white/70 mb-1 block">Buscar</label>
              <Input
                placeholder="Título ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-white/70 mb-1 block">Formato</label>
              <select
                value={filterFormat}
                onChange={(e) => setFilterFormat(e.target.value)}
                className="w-full bg-transparent border border-white/20 text-white rounded-md p-2"
              >
                <option className="text-black" value="all">Todos</option>
                <option className="text-black" value="Filme">Filme</option>
                <option className="text-black" value="Série">Série</option>
                <option className="text-black" value="Seriado">Seriado</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-white/70 mb-1 block">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-transparent border border-white/20 text-white rounded-md p-2"
              >
                <option className="text-black" value="all">Todos</option>
                <option className="text-black" value="aprovado">Aprovados</option>
                <option className="text-black" value="pendente">Pendentes</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={loadVideos}
                className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
                disabled={loading}
              >
                {loading ? "Carregando..." : "Atualizar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-400">{videos.length}</div>
            <div className="text-sm text-white/70">Total de Vídeos</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">
              {videos.filter(v => v.aprovado).length}
            </div>
            <div className="text-sm text-white/70">Aprovados</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-400">
              {videos.filter(v => !v.aprovado).length}
            </div>
            <div className="text-sm text-white/70">Pendentes</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">
              R$ {videos.reduce((sum, v) => sum + (v.custo_mensal || 0), 0)}
            </div>
            <div className="text-sm text-white/70">Custo Mensal Total</div>
          </div>
        </div>

        {/* Lista de vídeos */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-white/60 py-8">Carregando...</div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center text-white/60 py-8">
              {videos.length === 0 
                ? "Nenhum vídeo encontrado. Comece fazendo seu primeiro upload!"
                : "Nenhum vídeo corresponde aos filtros aplicados."
              }
            </div>
          ) : (
            filteredVideos.map((video) => (
              <div
                key={video.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition"
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-32 aspect-video bg-white/10 rounded overflow-hidden flex-shrink-0">
                    {video.capa_url ? (
                      <img
                        src={video.capa_url}
                        className="w-full h-full object-cover"
                        alt="Capa"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-white/40 text-xs">
                        Sem capa
                      </div>
                    )}
                  </div>

                  {/* Informações */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {video.titulo}
                        </h3>
                        {video.descricao && (
                          <p className="text-white/70 text-sm mt-1 line-clamp-2">
                            {video.descricao}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {video.aprovado ? (
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs">
                            ✓ Aprovado
                          </span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-xs">
                            ⏳ Pendente
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm text-white/60">
                      <span>{new Date(video.created_at).toLocaleDateString()}</span>
                      {video.formato && <span>{video.formato}</span>}
                      {video.duracao_minutos && (
                        <span>{video.duracao_minutos} min</span>
                      )}
                      {video.custo_mensal > 0 && (
                        <span className="text-amber-400">R$ {video.custo_mensal}/mês</span>
                      )}
                    </div>

                    {video.generos && video.generos.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {video.generos.map((genero) => (
                          <span
                            key={genero}
                            className="bg-white/10 text-white/80 px-2 py-1 rounded text-xs"
                          >
                            {genero}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-4">
                      {video.video_url && video.aprovado && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white"
                          onClick={() => window.open(video.video_url!, "_blank")}
                        >
                          Ver Vídeo
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                        onClick={() => deleteVideo(video.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
