import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { VideoRecord } from "@shared/api";

export default function Admin() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/videos");
      if (!res.ok) {
        console.error(`Erro ao carregar vídeos: HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setVideos(data.videos ?? []);
    } catch (error) {
      console.error("Erro ao carregar vídeos:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    await fetch(`/api/videos/${id}/approve`, { method: "POST" });
    await load();
  }

  async function revoke(id: string) {
    await fetch(`/api/videos/${id}/revoke`, { method: "POST" });
    await load();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0f19] via-[#101427] to-[#171A2F] text-white">
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Admin • Aprovação de vídeos
            </h1>
            <p className="mt-2 text-white/70">
              Revise, aprove e publique vídeos enviados.
            </p>
          </div>
          <Button
            onClick={load}
            className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
          >
            Atualizar
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && <div className="text-white/70">Carregando...</div>}
          {!loading && videos.length === 0 && (
            <div className="text-white/60">Nenhum vídeo encontrado.</div>
          )}
          {videos.map((v) => (
            <div
              key={v.id}
              className="rounded-xl overflow-hidden border border-white/10 bg-white/5"
            >
              {v.publicUrl ? (
                <video
                  src={v.publicUrl}
                  className="w-full aspect-video object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <div className="w-full aspect-video grid place-items-center text-white/40 text-sm">
                  Sem prévia
                </div>
              )}
              <div className="p-4 space-y-2">
                <div className="font-medium line-clamp-1">{v.title}</div>
                <div className="text-xs text-white/60">
                  {new Date(v.createdAt).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${v.approved ? "bg-emerald-400" : "bg-amber-400"}`}
                  />
                  <span className="text-white/70">
                    {v.approved ? "Aprovado" : "Pendente"}
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  {!v.approved ? (
                    <Button
                      onClick={() => approve(v.id)}
                      className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
                    >
                      Aprovar
                    </Button>
                  ) : (
                    <Button
                      onClick={() => revoke(v.id)}
                      variant="outline"
                      className="border-white/20 text-white"
                    >
                      Revogar
                    </Button>
                  )}
                  {v.publicUrl && (
                    <a
                      href={v.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/15 text-sm"
                    >
                      Ver
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
