import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import * as tus from "tus-js-client";

function formatETA(startAt: number | null, uploaded: number, total: number) {
  if (!startAt || uploaded <= 0 || total <= 0 || uploaded >= total) return "";
  const elapsed = (Date.now() - startAt) / 1000;
  const speed = uploaded / Math.max(elapsed, 0.001);
  const remaining = Math.max(total - uploaded, 0);
  const seconds = Math.round(remaining / Math.max(speed, 1));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `~${mm}:${ss} restante`;
}
function formatSpeed(startAt: number | null, uploaded: number) {
  if (!startAt || uploaded <= 0) return "";
  const elapsed = (Date.now() - startAt) / 1000;
  const bps = uploaded / Math.max(elapsed, 0.001);
  const mbps = bps / (1024 * 1024);
  return `${mbps.toFixed(2)} MB/s`;
}

export default function UploadFilme() {
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
          <h1 className="text-3xl font-extrabold">Upload de Filme</h1>
          <p className="text-white/70 text-sm">
            Conecte o Supabase para habilitar login e recursos.
          </p>
        </div>
      </div>
    );
  }

  return session ? (
    <Uploader />
  ) : (
    <div className="min-h-screen grid place-items-center text-white">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold">Área do Criador</h1>
        <p className="text-white/70">
          Faça login na página Criador para enviar filmes.
        </p>
        <a
          href="/creator"
          className="inline-block px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold"
        >
          Ir para login
        </a>
      </div>
    </div>
  );
}

function Uploader() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [biografia, setBiografia] = useState("");
  const [formato, setFormato] = useState<"Filme" | "Série" | "Seriado">(
    "Filme",
  );
  const [generos, setGeneros] = useState<string[]>([]);
  const [projetos, setProjetos] = useState<{ id: string; nome: string }[]>([]);
  const [projetoId, setProjetoId] = useState<string | "novo" | "">("");
  const [novoProjeto, setNovoProjeto] = useState<string>("");
  const [duracao, setDuracao] = useState<string>("");
  const [capa, setCapa] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [custo, setCusto] = useState(0);

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadStartAt, setUploadStartAt] = useState<number | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const user = (await supabase?.auth.getUser())?.data.user;
      if (!user) return;
      const { data } = await supabase!
        .from("projects")
        .select("id, nome")
        .eq("owner_id", user.id)
        .order("nome");
      setProjetos((data as any) ?? []);
    })().catch(() => {});
  }, []);

  const canSend = useMemo(
    () =>
      !!video &&
      !!capa &&
      titulo &&
      descricao &&
      biografia &&
      duracao &&
      !isUploading,
    [video, capa, titulo, descricao, biografia, duracao, isUploading],
  );

  function calcularBlocos(minsStr: string) {
    const dur = parseInt(minsStr);
    if (isNaN(dur) || dur <= 70) {
      setCusto(0);
    } else {
      const blocosExtras = Math.ceil((dur - 70) / 70);
      setCusto(blocosExtras * 1000);
    }
  }

  async function uploadCover() {
    if (!capa) return null;
    const token = (await supabase?.auth.getSession())?.data.session
      ?.access_token;
    const fd = new FormData();
    fd.append("file", capa);
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
      toast.error(errorMessage);
      return null;
    }

    const data = await res.json();
    return data.url as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    calcularBlocos(duracao);
    if (!video || !capa) return;

    setIsUploading(true);
    setProgress(0);
    setUploadedBytes(0);
    setTotalBytes(video.size);
    setUploadStartAt(Date.now());

    try {
      const url = await uploadCover();
      if (!url) throw new Error("Falha ao enviar capa");
      setCoverUrl(url);
      const token = (await supabase?.auth.getSession())?.data.session
        ?.access_token;
      let projectName: string | null = null;
      if (formato !== "Filme") {
        if (projetoId === "novo" && novoProjeto.trim()) {
          const user = (await supabase?.auth.getUser())?.data.user;
          if (user) {
            await supabase!
              .from("projects")
              .insert({ nome: novoProjeto.trim(), owner_id: user.id });
            projectName = novoProjeto.trim();
          }
        } else {
          const found = projetos.find((p) => p.id === projetoId);
          projectName = found?.nome || null;
        }
      }
      const tags = [
        formato.toLowerCase(),
        ...generos.map((g) => g.toLowerCase()),
      ];
      if (projectName) tags.push(`projeto:${projectName}`);

      const start = await fetch("/api/creators/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: titulo,
          description: `${descricao}\n\nBio: ${biografia}`,
          tags,
          coverUrl: url,
        }),
      });

      if (!start.ok) {
        let errorMessage = "Falha ao iniciar upload";
        try {
          const errorData = await start.json();
          errorMessage = errorData?.error || errorMessage;
        } catch {
          // Se falhar ao ler o JSON, usa a mensagem padrão
        }
        throw new Error(errorMessage);
      }

      const payload = await start.json();
      const { uploadUrl, uploadId } = payload as {
        uploadUrl: string;
        uploadId: string;
      };

      await new Promise<void>((resolve, reject) => {
        const up = new tus.Upload(video, {
          endpoint: uploadUrl,
          uploadUrl,
          chunkSize: 5 * 1024 * 1024,
          retryDelays: [0, 1000, 3000, 5000],
          metadata: { filename: video.name, filetype: video.type },
          onError(error) {
            reject(error);
          },
          onProgress(bytesUploaded, bytesTotal) {
            setUploadedBytes(bytesUploaded);
            setTotalBytes(bytesTotal);
            setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
          },
          onSuccess() {
            resolve();
          },
        });
        up.start();
      });

      await fetch("/api/creators/upload-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uploadId }),
      });

      toast.success("Filme enviado! Em processamento.");
      setTitulo("");
      setDescricao("");
      setBiografia("");
      setDuracao("");
      setCapa(null);
      setVideo(null);
      setProgress(0);
      setUploadedBytes(0);
      setTotalBytes(0);
      setUploadStartAt(null);
    } catch (err: any) {
      toast.error(err?.message || String(err));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-screen text-white">
      <section className="container mx-auto px-4 py-10 md:py-16">
        <h1 className="text-3xl md:text-4xl font-extrabold">Upload de Filme</h1>
        <p className="text-white/70">
          Preencha os dados e envie seu longa. A cobrança é calculada
          automaticamente.
        </p>

        <div className="mt-8 grid lg:grid-cols-[1.1fr,0.9fr] gap-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <form onSubmit={handleSubmit} className="grid gap-4">
              <Input
                placeholder="Título do Filme"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
                className="bg-transparent border-white/20 text-white"
              />
              <textarea
                placeholder="Descrição"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
                rows={3}
                className="bg-transparent border border-white/20 text-white rounded-md p-2"
              />
              <textarea
                placeholder="Biografia do Criador"
                value={biografia}
                onChange={(e) => setBiografia(e.target.value)}
                required
                rows={2}
                className="bg-transparent border border-white/20 text-white rounded-md p-2"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm text-white/70">Formato</label>
                  <select
                    value={formato}
                    onChange={(e) => setFormato(e.target.value as any)}
                    className="bg-transparent border border-white/20 text-white rounded-md p-2"
                  >
                    <option className="text-black" value="Filme">
                      Filme
                    </option>
                    <option className="text-black" value="Série">
                      Série
                    </option>
                    <option className="text-black" value="Seriado">
                      Seriado
                    </option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/70">Gêneros</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Ação",
                      "Terror",
                      "Drama",
                      "Comédia",
                      "Ficção",
                      "Documentário",
                      "Romance",
                    ].map((g) => (
                      <label
                        key={g}
                        className="inline-flex items-center gap-2 text-sm bg-white/5 border border-white/10 rounded px-2 py-1"
                      >
                        <input
                          type="checkbox"
                          className="accent-emerald-500"
                          checked={generos.includes(g)}
                          onChange={(e) =>
                            setGeneros((prev) =>
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
              </div>

              {formato !== "Filme" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm text-white/70">
                      Projeto (série)
                    </label>
                    <select
                      value={projetoId}
                      onChange={(e) => setProjetoId(e.target.value)}
                      className="bg-transparent border border-white/20 text-white rounded-md p-2"
                    >
                      <option className="text-black" value="">
                        Selecionar...
                      </option>
                      {projetos.map((p) => (
                        <option className="text-black" key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                      <option className="text-black" value="novo">
                        + Criar novo
                      </option>
                    </select>
                  </div>
                  {projetoId === "novo" && (
                    <div className="space-y-2">
                      <label className="text-sm text-white/70">
                        Novo projeto
                      </label>
                      <Input
                        placeholder="Nome do projeto"
                        value={novoProjeto}
                        onChange={(e) => setNovoProjeto(e.target.value)}
                        className="bg-transparent border-white/20 text-white"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => setCapa(e.target.files?.[0] || null)}
                />
                <Button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-semibold shadow-lg hover:from-emerald-300 hover:to-cyan-300"
                >
                  Escolher capa
                </Button>
                {capa && (
                  <span className="text-xs text-white/70 truncate max-w-[50%]">
                    {capa.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={(e) => setVideo(e.target.files?.[0] || null)}
                />
                <Button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-semibold shadow-lg hover:from-emerald-300 hover:to-cyan-300"
                >
                  Escolher vídeo
                </Button>
                {video && (
                  <span className="text-xs text-white/70 truncate max-w-[50%]">
                    {video.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={1}
                  placeholder="Duração (min)"
                  value={duracao}
                  onChange={(e) => {
                    setDuracao(e.target.value);
                    calcularBlocos(e.target.value);
                  }}
                  required
                  className="bg-transparent border-white/20 text-white"
                />
                <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                  <div>
                    Até 70 minutos: <strong>Grátis</strong>
                  </div>
                  <div>
                    Blocos extras (R$ 1000 cada):{" "}
                    <strong>R$ {custo.toLocaleString("pt-BR")},00/mês</strong>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={!canSend}
                  className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
                >
                  {isUploading ? `Enviando ${progress}%` : "Enviar Filme"}
                </Button>
              </div>

              {isUploading && (
                <div className="mt-2">
                  <Progress value={progress} className="h-2 bg-white/10" />
                  <div className="text-xs text-white/70 mt-2 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <span>{progress}%</span>
                    <span>
                      {Math.round(uploadedBytes / (1024 * 1024))} MB /{" "}
                      {Math.max(1, Math.round(totalBytes / (1024 * 1024)))} MB
                    </span>
                    <span>{formatSpeed(uploadStartAt, uploadedBytes)}</span>
                    <span className="text-right sm:text-left">
                      {formatETA(uploadStartAt, uploadedBytes, totalBytes)}
                    </span>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold mb-3">Pré-visualização</h3>
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/40">
              <iframe
                src="https://player.mux.com/GXYt7auaPNeRSWVIQWjQnTYvnDol01fczNPjaMjhvjYU"
                style={{ width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
                title="mux-preview"
              />
            </div>
            {coverUrl && (
              <div className="mt-4">
                <div className="text-sm text-white/70 mb-2">Capa enviada</div>
                <img
                  src={coverUrl}
                  className="w-full rounded-lg border border-white/10"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
