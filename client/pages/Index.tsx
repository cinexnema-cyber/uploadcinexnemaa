import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { VideoRecord } from "@shared/api";

function formatETA(startAt: number | null, uploaded: number, total: number) {
  if (!startAt || uploaded <= 0 || total <= 0 || uploaded >= total) return "";
  const elapsed = (Date.now() - startAt) / 1000;
  const speed = uploaded / Math.max(elapsed, 0.001); // bytes per second
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

export default function Index() {
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [format, setFormat] = useState<"Filme" | "Série" | "Seriado">("Filme");
  const [genres, setGenres] = useState<string[]>([]);
  const [project, setProject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadStartAt, setUploadStartAt] = useState<number | null>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canUpload = useMemo(() => !!file && !isUploading, [file, isUploading]);

  useEffect(() => {
    loadPublic();
  }, []);

  async function loadPublic() {
    try {
      const res = await fetch("/api/videos/public");
      if (!res.ok) {
        console.error(`Erro ao carregar vídeos públicos: HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setVideos(data.videos ?? []);
    } catch (error) {
      console.error("Erro ao carregar vídeos públicos:", error);
    }
  }

  const [thumb, setThumb] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  function onFileSelected(f: File | null) {
    setFile(f);
    setThumb(null);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (f) {
      const url = URL.createObjectURL(f);
      setObjectUrl(url);
      // generate thumbnail
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.playsInline = true as any;
      video.addEventListener("loadeddata", () => {
        // try capture at 1s, fallback to 0
        const capture = () => {
          try {
            const canvas = document.createElement("canvas");
            const w = video.videoWidth || 1280;
            const h = video.videoHeight || 720;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, w, h);
              setThumb(canvas.toDataURL("image/jpeg", 0.7));
            }
          } catch {}
        };
        if (video.readyState >= 2) {
          // seek to 1s when possible
          const target = Math.min(
            1,
            Math.max(0, video.duration ? Math.min(1, video.duration - 0.1) : 0),
          );
          video.currentTime = target;
          video.addEventListener("seeked", capture, { once: true });
        } else {
          capture();
        }
      });
    }
  }

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    setProgress(0);
    setUploadedBytes(0);
    setTotalBytes(file.size);
    setUploadStartAt(Date.now());

    try {
      // 1) Upload direto ao Supabase Storage
      const { uploadVideoViaSignedUrl } = await import("@/lib/video-upload");
      const uploaded = await uploadVideoViaSignedUrl(file);
      setUploadedBytes(file.size);
      setProgress(100);

      // 2) Registrar metadados no backend
      const save = await fetch("/api/videos/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || file.name,
          bio,
          format,
          genres,
          project: format === "Filme" ? undefined : project || undefined,
          publicUrl: uploaded.publicUrl,
          bucket: uploaded.bucket,
          path: uploaded.path,
        }),
      });

      if (!save.ok) {
        let errorMessage = `HTTP ${save.status}`;
        try {
          const errorData = await save.json();
          errorMessage = errorData?.message || errorData?.error || errorMessage;
        } catch {
          // Se falhar ao ler o JSON, usa a mensagem padrão
        }
        throw new Error(errorMessage);
      }

      const data = await save.json();

      toast.success("Upload concluído!");
      setFile(null);
      setTitle("");
      setBio("");
      setFormat("Filme");
      setGenres([]);
      setProject("");
      if (inputRef.current) inputRef.current.value = "";

      // Atualiza lista
      setTimeout(loadPublic, 1000);
    } catch (e: any) {
      toast.error(e?.message || String(e));
    } finally {
      setIsUploading(false);
      setProgress(0);
      setUploadedBytes(0);
      setTotalBytes(0);
      setUploadStartAt(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0f19] via-[#101427] to-[#171A2F] text-white">
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Cinexnema Upload videos
            </h1>
            <p className="mt-3 text-white/70 max-w-2xl">
              Envie seus vídeos. Após o processamento, o admin avalia e libera o
              conteúdo para a plataforma.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => inputRef.current?.click()}
                className="bg-emerald-500 hover:bg-emerald-500/90 text-black font-semibold"
              >
                Novo upload
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-5 w-full md:w-auto">
            <div className="text-sm text-white/70 mb-2">Status</div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/90">Operacional</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1.1fr,0.9fr] gap-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
            <h2 className="text-xl font-semibold mb-4">Enviar novo vídeo</h2>
            <div
              className={cn(
                "mt-2 rounded-xl border-2 border-dashed p-6 text-white/70 transition",
                file
                  ? "border-emerald-400/50 bg-emerald-400/5"
                  : "border-white/15 bg-white/5",
              )}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) onFileSelected(f);
              }}
            >
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="opacity-80"
                >
                  <path
                    d="M12 16V8m0 0l3 3m-3-3L9 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 16.5a4.5 4.5 0 00-4.5-4.5h-7A4.5 4.5 0 004 16.5v0A3.5 3.5 0 007.5 20h9A3.5 3.5 0 0020 16.5v0z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <div className="font-medium text-white">
                    Arraste e solte o arquivo aqui
                  </div>
                  <div className="text-xs text-white/60 mt-1">ou</div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:justify-center">
                  <Input
                    ref={inputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) =>
                      onFileSelected(e.target.files?.[0] || null)
                    }
                    className="sr-only"
                  />
                  <Button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-semibold shadow-lg hover:from-emerald-300 hover:to-cyan-300"
                  >
                    Escolher vídeo
                  </Button>
                  <Input
                    type="text"
                    placeholder="Título do vídeo (opcional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-transparent border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <textarea
                    placeholder="Biografia do criador"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    className="bg-transparent border border-white/20 text-white rounded-md p-2"
                  />
                  <div className="space-y-2 text-left">
                    <label className="text-sm text-white/70">Formato</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as any)}
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
                </div>

                <div className="w-full text-left mt-3">
                  <div className="text-sm text-white/70 mb-2">Gêneros</div>
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

                {format !== "Filme" && (
                  <div className="w-full mt-3">
                    <Input
                      type="text"
                      placeholder="Projeto (série/seriado)"
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      className="bg-transparent border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                )}

                <div className="w-full mt-3">
                  <Button
                    disabled={!canUpload}
                    onClick={handleUpload}
                    className="bg-emerald-500 hover:bg-emerald-500/90 text-black font-semibold"
                  >
                    {isUploading ? `Enviando ${progress}%` : "Enviar vídeo"}
                  </Button>
                </div>
                {file && (
                  <div className="w-full mt-3 grid gap-2">
                    <div className="text-xs text-white/60">
                      Selecionado: {file.name}
                    </div>
                    {(thumb || objectUrl) && (
                      <div className="rounded-lg overflow-hidden border border-white/10 bg-black/30">
                        <img
                          src={thumb || objectUrl || undefined}
                          alt="Pré-visualização"
                          className="w-full aspect-video object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isUploading && (
              <div className="mt-4">
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
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
            <h2 className="text-xl font-semibold mb-4">Publicados</h2>
            {videos.length === 0 ? (
              <div className="text-white/60 text-sm">
                Nenhum vídeo publicado ainda.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {videos.map((v) => (
                  <a
                    key={v.id}
                    href={v.publicUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-xl overflow-hidden border border-white/10 bg-black/40 hover:scale-[1.01] transition"
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
                    <div className="p-3 border-t border-white/10">
                      <div className="text-sm font-medium line-clamp-1">
                        {v.title}
                      </div>
                      <div className="text-xs text-white/60">
                        {new Date(v.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MuxNotice() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/videos/config");
        if (!res.ok) {
          setConfigured(false);
          return;
        }
        const data = await res.json();
        setConfigured(!!data.muxConfigured);
      } catch {
        setConfigured(false);
      }
    })();
  }, []);

  if (configured === null) return null;
  if (configured) return null;
  return (
    <div className="mt-6 rounded-lg border border-amber-400/40 bg-amber-400/10 text-amber-200 p-4 text-sm">
      Para habilitar uploads reais, configure as variáveis MUX_TOKEN_ID e
      MUX_TOKEN_SECRET no servidor.
    </div>
  );
}
