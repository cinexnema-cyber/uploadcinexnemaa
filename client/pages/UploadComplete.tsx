import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface UploadFormData {
  // Informações básicas
  titulo: string;
  tituloAlternativo: string;
  tipoConteudo: "Filme" | "Série" | "Curta" | "Documentário";
  generos: string[];
  sinopseCurta: string;
  descricaoLonga: string;
  anoLancamento: number;
  duracao: number;
  idiomaOriginal: string;
  legendasDisponiveis: string;
  diretores: string;
  produtores: string;
  elenco: string;
  classificacao: "Livre" | "12+" | "16+" | "18+";
  
  // Arquivos
  capaFile: File | null;
  bannerFile: File | null;
  thumbnailFile: File | null;
  screenshotsFiles: File[];
  videoFile: File | null;
  
  // URLs após upload
  capaUrl: string;
  bannerUrl: string;
  thumbnailUrl: string;
  screenshotsUrls: string[];
  
  // Metadados técnicos
  codecVideo: string;
  framerate: number;
  bitrate: number;
  resolucao: string;
  
  // Direitos e acesso
  direitosAutorais: string;
  tipoAcesso: "Gratuito" | "Assinante" | "Pago" | "Aluguel";
  dataLancamento: string;
  restricaoGeografica: string;
  
  // Extras
  trailerUrl: string;
  conteudoBonus: string;
  tags: string[];
}

const initialFormData: UploadFormData = {
  titulo: "",
  tituloAlternativo: "",
  tipoConteudo: "Filme",
  generos: [],
  sinopseCurta: "",
  descricaoLonga: "",
  anoLancamento: new Date().getFullYear(),
  duracao: 0,
  idiomaOriginal: "Português",
  legendasDisponiveis: "",
  diretores: "",
  produtores: "",
  elenco: "",
  classificacao: "Livre",
  
  capaFile: null,
  bannerFile: null,
  thumbnailFile: null,
  screenshotsFiles: [],
  videoFile: null,
  
  capaUrl: "",
  bannerUrl: "",
  thumbnailUrl: "",
  screenshotsUrls: [],
  
  codecVideo: "H.264",
  framerate: 24,
  bitrate: 2500,
  resolucao: "1920x1080",
  
  direitosAutorais: "",
  tipoAcesso: "Gratuito",
  dataLancamento: "",
  restricaoGeografica: "",
  
  trailerUrl: "",
  conteudoBonus: "",
  tags: []
};

const generosList = [
  "Ação", "Aventura", "Comédia", "Drama", "Terror", "Suspense", "Romance", 
  "Ficção Científica", "Fantasia", "Documentário", "Animação", "Musical", 
  "Guerra", "História", "Crime", "Thriller", "Mistério", "Família"
];

export default function UploadComplete() {
  const [session, setSession] = useState<any>(null);
  const [formData, setFormData] = useState<UploadFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen grid place-items-center text-white">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-3xl font-extrabold">Upload Completo</h1>
          <p className="text-white/70 text-sm">Configure o Supabase para continuar.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center text-white">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-3xl font-extrabold">Upload Completo</h1>
          <p className="text-white/70 text-sm">Faça login para acessar o formulário completo.</p>
          <Button onClick={() => window.location.href = "/creator"}>
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  const updateFormData = (field: keyof UploadFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenreToggle = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      generos: prev.generos.includes(genre)
        ? prev.generos.filter(g => g !== genre)
        : [...prev.generos, genre]
    }));
  };

  const uploadFile = async (file: File, bucket: string, prefix: string) => {
    try {
      const res = await fetch("/api/storage/signed-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket,
          filename: `${Date.now()}-${file.name}`,
          prefix
        })
      });

      if (!res.ok) throw new Error("Erro ao criar signed URL");
      
      const { uploadUrl, token, publicUrl } = await res.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
          "Authorization": `Bearer ${token}`
        }
      });

      if (!uploadRes.ok) throw new Error("Erro no upload");
      
      return publicUrl;
    } catch (error) {
      console.error("Erro no upload:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!formData.titulo || !formData.sinopseCurta || !formData.videoFile || !formData.capaFile) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      
      // Upload da capa (obrigatório)
      setUploadProgress(10);
      const capaUrl = await uploadFile(formData.capaFile, "covers", "posters");
      updateFormData("capaUrl", capaUrl);

      // Upload da thumbnail (obrigatório)
      setUploadProgress(20);
      let thumbnailUrl = "";
      if (formData.thumbnailFile) {
        thumbnailUrl = await uploadFile(formData.thumbnailFile, "thumbnails", "content");
        updateFormData("thumbnailUrl", thumbnailUrl);
      }

      // Upload do banner (opcional)
      setUploadProgress(30);
      let bannerUrl = "";
      if (formData.bannerFile) {
        bannerUrl = await uploadFile(formData.bannerFile, "banners", "content");
        updateFormData("bannerUrl", bannerUrl);
      }

      // Upload das screenshots (opcional)
      setUploadProgress(40);
      const screenshotsUrls = [];
      for (const screenshot of formData.screenshotsFiles) {
        const url = await uploadFile(screenshot, "screenshots", "content");
        screenshotsUrls.push(url);
      }
      updateFormData("screenshotsUrls", screenshotsUrls);

      // Upload do vídeo principal
      setUploadProgress(60);
      const videoUrl = await uploadFile(formData.videoFile, "videos", "content");

      // Salvar no banco de dados
      setUploadProgress(90);
      const saveRes = await fetch("/api/creators/upload-complete-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          videoUrl,
          capaUrl,
          thumbnailUrl,
          bannerUrl,
          screenshotsUrls
        })
      });

      if (!saveRes.ok) throw new Error("Erro ao salvar dados");

      setUploadProgress(100);
      toast.success("Upload concluído com sucesso!");
      
      // Reset form
      setFormData(initialFormData);
      setCurrentStep(1);
      
    } catch (error: any) {
      toast.error(error.message || "Erro no upload");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold mb-4">1. Informações Básicas</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Título do conteúdo *</label>
          <Input
            value={formData.titulo}
            onChange={(e) => updateFormData("titulo", e.target.value)}
            placeholder="Ex: O Senhor dos Anéis"
            className="bg-transparent border-white/20 text-white"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Título alternativo</label>
          <Input
            value={formData.tituloAlternativo}
            onChange={(e) => updateFormData("tituloAlternativo", e.target.value)}
            placeholder="Ex: The Lord of the Rings"
            className="bg-transparent border-white/20 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tipo de conteúdo *</label>
          <select
            value={formData.tipoConteudo}
            onChange={(e) => updateFormData("tipoConteudo", e.target.value)}
            className="w-full bg-transparent border border-white/20 text-white rounded-md p-3"
            required
          >
            <option className="text-black" value="Filme">Filme</option>
            <option className="text-black" value="Série">Série</option>
            <option className="text-black" value="Curta">Curta</option>
            <option className="text-black" value="Documentário">Documentário</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Classificação indicativa *</label>
          <select
            value={formData.classificacao}
            onChange={(e) => updateFormData("classificacao", e.target.value)}
            className="w-full bg-transparent border border-white/20 text-white rounded-md p-3"
            required
          >
            <option className="text-black" value="Livre">Livre</option>
            <option className="text-black" value="12+">12+</option>
            <option className="text-black" value="16+">16+</option>
            <option className="text-black" value="18+">18+</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Ano de lançamento *</label>
          <Input
            type="number"
            value={formData.anoLancamento}
            onChange={(e) => updateFormData("anoLancamento", parseInt(e.target.value))}
            min="1900"
            max={new Date().getFullYear() + 5}
            className="bg-transparent border-white/20 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Duração (minutos) *</label>
          <Input
            type="number"
            value={formData.duracao}
            onChange={(e) => updateFormData("duracao", parseInt(e.target.value))}
            placeholder="Ex: 120"
            className="bg-transparent border-white/20 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Idioma original *</label>
          <Input
            value={formData.idiomaOriginal}
            onChange={(e) => updateFormData("idiomaOriginal", e.target.value)}
            placeholder="Ex: Português"
            className="bg-transparent border-white/20 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Legendas disponíveis</label>
          <Input
            value={formData.legendasDisponiveis}
            onChange={(e) => updateFormData("legendasDisponiveis", e.target.value)}
            placeholder="Ex: Português, Inglês, Espanhol"
            className="bg-transparent border-white/20 text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Gêneros *</label>
        <div className="flex flex-wrap gap-2">
          {generosList.map(genre => (
            <label
              key={genre}
              className="inline-flex items-center gap-2 text-sm bg-white/5 border border-white/10 rounded px-3 py-2 cursor-pointer hover:bg-white/10"
            >
              <input
                type="checkbox"
                checked={formData.generos.includes(genre)}
                onChange={() => handleGenreToggle(genre)}
                className="accent-emerald-500"
              />
              <span>{genre}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Sinopse curta *</label>
        <textarea
          value={formData.sinopseCurta}
          onChange={(e) => updateFormData("sinopseCurta", e.target.value)}
          placeholder="Descrição em 1-3 linhas sobre o conteúdo..."
          rows={3}
          className="w-full bg-transparent border border-white/20 text-white rounded-md p-3 resize-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Descrição longa</label>
        <textarea
          value={formData.descricaoLonga}
          onChange={(e) => updateFormData("descricaoLonga", e.target.value)}
          placeholder="Descrição detalhada do conteúdo..."
          rows={5}
          className="w-full bg-transparent border border-white/20 text-white rounded-md p-3 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Diretor(es)</label>
          <Input
            value={formData.diretores}
            onChange={(e) => updateFormData("diretores", e.target.value)}
            placeholder="Ex: Peter Jackson"
            className="bg-transparent border-white/20 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Produtor(es)</label>
          <Input
            value={formData.produtores}
            onChange={(e) => updateFormData("produtores", e.target.value)}
            placeholder="Ex: Barrie M. Osborne"
            className="bg-transparent border-white/20 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Elenco principal</label>
          <Input
            value={formData.elenco}
            onChange={(e) => updateFormData("elenco", e.target.value)}
            placeholder="Ex: Elijah Wood, Ian McKellen"
            className="bg-transparent border-white/20 text-white"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold mb-4">2. Imagens / Artes</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Capa principal (poster) *</label>
          <div className="text-xs text-white/60 mb-2">JPG/PNG, mínimo 600x900px</div>
          <Input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => updateFormData("capaFile", e.target.files?.[0] || null)}
            className="bg-transparent border-white/20 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Miniatura (thumbnail) *</label>
          <div className="text-xs text-white/60 mb-2">JPG/PNG, mínimo 320x180px</div>
          <Input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => updateFormData("thumbnailFile", e.target.files?.[0] || null)}
            className="bg-transparent border-white/20 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Banner / destaque</label>
          <div className="text-xs text-white/60 mb-2">JPG/PNG, mínimo 1280x720px</div>
          <Input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => updateFormData("bannerFile", e.target.files?.[0] || null)}
            className="bg-transparent border-white/20 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Screenshots / stills</label>
          <div className="text-xs text-white/60 mb-2">Até 5 imagens, JPG/PNG</div>
          <Input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={(e) => updateFormData("screenshotsFiles", Array.from(e.target.files || []).slice(0, 5))}
            className="bg-transparent border-white/20 text-white"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold mb-4">3. Vídeos e Metadados</h2>
      
      <div>
        <label className="block text-sm font-medium mb-2">Arquivo de vídeo principal *</label>
        <div className="text-xs text-white/60 mb-2">MP4, resolução mínima 720p</div>
        <Input
          type="file"
          accept="video/mp4"
          onChange={(e) => updateFormData("videoFile", e.target.files?.[0] || null)}
          className="bg-transparent border-white/20 text-white"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Codec de vídeo</label>
          <Input
            value={formData.codecVideo}
            onChange={(e) => updateFormData("codecVideo", e.target.value)}
            placeholder="Ex: H.264"
            className="bg-transparent border-white/20 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Frame rate (fps)</label>
          <Input
            type="number"
            value={formData.framerate}
            onChange={(e) => updateFormData("framerate", parseInt(e.target.value))}
            placeholder="Ex: 24"
            className="bg-transparent border-white/20 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Taxa de bits (kbps)</label>
          <Input
            type="number"
            value={formData.bitrate}
            onChange={(e) => updateFormData("bitrate", parseInt(e.target.value))}
            placeholder="Ex: 2500"
            className="bg-transparent border-white/20 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Resolução</label>
          <Input
            value={formData.resolucao}
            onChange={(e) => updateFormData("resolucao", e.target.value)}
            placeholder="Ex: 1920x1080"
            className="bg-transparent border-white/20 text-white"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold mb-4">4. Direitos e Acesso</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Direitos autorais / distribuidor *</label>
          <Input
            value={formData.direitosAutorais}
            onChange={(e) => updateFormData("direitosAutorais", e.target.value)}
            placeholder="Ex: Warner Bros"
            className="bg-transparent border-white/20 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tipo de acesso</label>
          <select
            value={formData.tipoAcesso}
            onChange={(e) => updateFormData("tipoAcesso", e.target.value)}
            className="w-full bg-transparent border border-white/20 text-white rounded-md p-3"
          >
            <option className="text-black" value="Gratuito">Gratuito</option>
            <option className="text-black" value="Assinante">Assinante</option>
            <option className="text-black" value="Pago">Pago</option>
            <option className="text-black" value="Aluguel">Aluguel</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Data de lançamento</label>
          <Input
            type="date"
            value={formData.dataLancamento}
            onChange={(e) => updateFormData("dataLancamento", e.target.value)}
            className="bg-transparent border-white/20 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Restrição geográfica</label>
          <Input
            value={formData.restricaoGeografica}
            onChange={(e) => updateFormData("restricaoGeografica", e.target.value)}
            placeholder="Ex: Brasil, Portugal"
            className="bg-transparent border-white/20 text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Trailer oficial (URL)</label>
        <Input
          value={formData.trailerUrl}
          onChange={(e) => updateFormData("trailerUrl", e.target.value)}
          placeholder="Ex: https://youtube.com/watch?v=..."
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Conteúdo bônus</label>
        <textarea
          value={formData.conteudoBonus}
          onChange={(e) => updateFormData("conteudoBonus", e.target.value)}
          placeholder="Making of, cenas deletadas, comentários..."
          rows={3}
          className="w-full bg-transparent border border-white/20 text-white rounded-md p-3 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tags / palavras-chave</label>
        <Input
          value={formData.tags.join(", ")}
          onChange={(e) => updateFormData("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
          placeholder="Ex: aventura, magia, fantasia medieval"
          className="bg-transparent border-white/20 text-white"
        />
      </div>
    </div>
  );

  const steps = [
    { number: 1, title: "Informações Básicas", component: renderStep1 },
    { number: 2, title: "Imagens / Artes", component: renderStep2 },
    { number: 3, title: "Vídeos e Metadados", component: renderStep3 },
    { number: 4, title: "Direitos e Acesso", component: renderStep4 },
  ];

  return (
    <div className="min-h-screen text-white">
      <section className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold">Upload Completo</h1>
              <p className="text-white/70">Formulário detalhado para upload de conteúdo</p>
            </div>
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => window.location.href = "/creator"}
            >
              ← Voltar
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {steps.map(step => (
                <div
                  key={step.number}
                  className={`flex items-center ${
                    step.number === currentStep ? "text-emerald-400" : 
                    step.number < currentStep ? "text-emerald-300" : "text-white/50"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-2 ${
                    step.number === currentStep ? "border-emerald-400 bg-emerald-400/10" :
                    step.number < currentStep ? "border-emerald-300 bg-emerald-300/10" : "border-white/20"
                  }`}>
                    {step.number < currentStep ? "✓" : step.number}
                  </div>
                  <span className="text-sm hidden md:block">{step.title}</span>
                </div>
              ))}
            </div>
            <Progress value={(currentStep / steps.length) * 100} className="h-2 bg-white/10" />
          </div>

          {/* Form Content */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
            {steps[currentStep - 1]?.component()}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              ← Anterior
            </Button>

            {currentStep < steps.length ? (
              <Button
                className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
                onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
              >
                Próximo →
              </Button>
            ) : (
              <Button
                className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
                onClick={handleSubmit}
                disabled={isUploading}
              >
                {isUploading ? `Enviando ${uploadProgress}%` : "Finalizar Upload"}
              </Button>
            )}
          </div>

          {isUploading && (
            <div className="mt-6">
              <Progress value={uploadProgress} className="h-2 bg-white/10" />
              <div className="text-center text-sm text-white/70 mt-2">
                Fazendo upload... {uploadProgress}%
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
