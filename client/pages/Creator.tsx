import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import * as tus from "tus-js-client";

interface VideoRow {
  id: string;
  titulo: string;
  descricao: string | null;
  capa_url: string | null;
  status: string;
  playback_id: string | null;
  created_at: string;
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
            Clique em “Open MCP popover” e conecte o Supabase, ou informe
            VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
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

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) toast.error(error.message);
    setLoading(false);
  }

  async function handleSignUp() {
    if (!supabase) return;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) toast.error(error.message);
    else toast.success("Conta criada. Faça login.");
  }

  return (
    <div className="min-h-screen grid place-items-center text-white">
      <form
        onSubmit={handleSignIn}
        className="w-full max-w-sm space-y-3 border border-white/10 bg-white/5 p-6 rounded-xl"
      >
        <h1 className="text-xl font-semibold">Área do Criador</h1>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-transparent border-white/20 text-white"
        />
        <Input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-transparent border-white/20 text-white"
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
            disabled={loading}
          >
            Entrar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-white/20 text-white"
            onClick={handleSignUp}
            disabled={loading}
          >
            Criar conta
          </Button>
        </div>
      </form>
    </div>
  );
}

function Dashboard() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadStartAt, setUploadStartAt] = useState<number | null>(null);
  const [items, setItems] = useState<VideoRow[]>([]);

  const canSend = useMemo(() => !!video && !isUploading, [video, isUploading]);

  async function load() {
    const token = (await supabase?.auth.getSession())?.data.session
      ?.access_token;
    const res = await fetch("/api/creators/videos", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setItems(data.videos ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function uploadCoverNow() {
    if (!cover) return;
    const token = (await supabase?.auth.getSession())?.data.session
      ?.access_token;
    const fd = new FormData();
    fd.append("file", cover);
    const res = await fetch("/api/creators/cover", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data?.message || "Erro ao enviar capa");
    setCoverUrl(data.url);
    toast.success("Capa enviada");
  }

  async function handleUpload() {
    if (!video) return;
    setIsUploading(true);
    setProgress(0);
    setUploadedBytes(0);
    setTotalBytes(video.size);
    setUploadStartAt(Date.now());
    try {
      const token = (await supabase?.auth.getSession())?.data.session
        ?.access_token;
      const start = await fetch("/api/creators/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          tags: tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          coverUrl,
        }),
      });
      const payload = await start.json();
      if (!start.ok) {
        toast.error(payload?.error || "Falha ao iniciar upload");
        setIsUploading(false);
        return;
      }
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

      toast.success("Upload concluído e em processamento");
      setTitle("");
      setDescription("");
      setTags("");
      setCover(null);
      setCoverUrl(null);
      setVideo(null);
      setProgress(0);
      setUploadedBytes(0);
      setTotalBytes(0);
      setUploadStartAt(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || String(e));
    } finally {
      setIsUploading(false);
    }
  }

  function formatETA() {
    if (
      !uploadStartAt ||
      uploadedBytes <= 0 ||
      totalBytes <= 0 ||
      uploadedBytes >= totalBytes
    )
      return "";
    const elapsed = (Date.now() - uploadStartAt) / 1000;
    const speed = uploadedBytes / Math.max(elapsed, 0.001);
    const remaining = Math.max(totalBytes - uploadedBytes, 0);
    const seconds = Math.round(remaining / Math.max(speed, 1));
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return `~${mm}:${ss} restante`;
  }
  function formatSpeed() {
    if (!uploadStartAt || uploadedBytes <= 0) return "";
    const elapsed = (Date.now() - uploadStartAt) / 1000;
    const bps = uploadedBytes / Math.max(elapsed, 0.001);
    const mbps = bps / (1024 * 1024);
    return `${mbps.toFixed(2)} MB/s`;
  }

  return (
    <div className="min-h-screen text-white">
      <section className="container mx-auto px-4 py-10 md:py-16">
        <h1 className="text-3xl md:text-4xl font-extrabold">Área do Criador</h1>
        <p className="text-white/70">Envie vídeos e gerencie seus conteúdos.</p>

        <div className="mt-8 grid lg:grid-cols-[1.1fr,0.9fr] gap-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4">Novo envio</h2>
            <div className="grid gap-3">
              <Input
                placeholder="Título do vídeo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-transparent border-white/20 text-white"
              />
              <Input
                placeholder="Descrição"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-transparent border-white/20 text-white"
              />
              <Input
                placeholder="Tags (separadas por vírgula)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="bg-transparent border-white/20 text-white"
              />
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
                  <span className="text-xs text-emerald-300">Capa pronta</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideo(e.target.files?.[0] || null)}
                  className="sr-only"
                  id="creator-video-input"
                />
                <Button
                  type="button"
                  onClick={() =>
                    document.getElementById("creator-video-input")?.click()
                  }
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
              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!canSend}
                  className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
                >
                  {isUploading ? `Enviando ${progress}%` : "Enviar vídeo"}
                </Button>
                <Button
                  variant="outline"
                  className="border-white/20 text-white"
                  onClick={() => supabase?.auth.signOut()}
                >
                  Sair
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
                    <span>{formatSpeed()}</span>
                    <span className="text-right sm:text-left">
                      {formatETA()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4">Seus vídeos</h2>
            <div className="grid gap-3">
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
                  <div className="w-24 aspect-video bg-white/10 rounded overflow-hidden">
                    {v.playback_id ? (
                      <img
                        src={`https://image.mux.com/${v.playback_id}/thumbnail.webp?time=1`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-white/40 text-xs">
                        {v.status}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{v.titulo}</div>
                    <div className="text-xs text-white/60">
                      {new Date(v.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-white/20 text-white"
                    onClick={() => onDelete(v.id, setItems)}
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
}

async function onDelete(id: string, setItems: (rows: any) => void) {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  const res = await fetch(`/api/creators/video/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return toast.error("Erro ao excluir");
  const list = await fetch("/api/creators/videos", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await list.json();
  setItems(data.videos ?? []);
}
