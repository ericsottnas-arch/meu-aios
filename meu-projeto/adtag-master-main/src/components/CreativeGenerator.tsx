import { useState, useEffect } from "react";
import { Copy, Check, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import History from "./History";

interface CreativeGeneratorProps {
  clientId: string;
}

const CreativeGenerator = ({ clientId }: CreativeGeneratorProps) => {
  const [creativeNumber, setCreativeNumber] = useState(1);
  const [format, setFormat] = useState("");
  const [hook, setHook] = useState("");
  const [cta, setCta] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  const formatOptions = [
    "Estático",
    "Carrossel",
    "Vídeo",
    "Stories",
    "Reels",
    "Coleção",
  ];

  const ctaOptions = [
    "Saiba Mais",
    "Compre Agora",
    "Cadastre-se",
    "Fale Conosco",
    "Ver Mais",
    "Baixar",
    "Agendar",
    "Visita ao Perfil",
  ];

  // Reset fields when client changes
  useEffect(() => {
    setFormat("");
    setHook("");
    setCta("");
    setRefreshKey((k) => k + 1);
  }, [clientId]);

  const generateResult = () => {
    const parts = [`C${creativeNumber}`];
    if (format) parts.push(`[${format}]`);
    if (hook) parts.push(`[Hook: ${hook}]`);
    if (cta) parts.push(`[CTA: ${cta}]`);
    return parts.join(" ");
  };

  const result = generateResult();

  const handleCopyAndSave = async () => {
    if (!result || result === `C${creativeNumber}`) return;
    
    // Copy to clipboard
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);

    // Auto-save if user is logged in
    if (user) {
      setSaving(true);
      const { error } = await supabase.from("generated_creatives").insert({
        user_id: user.id,
        client_id: clientId,
        code: `C${creativeNumber}`,
        name: result,
        format: format || null,
        cta: cta || null,
      });

      if (error) {
        toast.error("Erro ao salvar criativo");
      } else {
        setRefreshKey((k) => k + 1);
        // Increment number for next creative
        setCreativeNumber((n) => n + 1);
        // Reset fields
        setFormat("");
        setHook("");
        setCta("");
      }
      setSaving(false);
    }
  };

  const handleNextNumber = (num: number) => {
    setCreativeNumber(num);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Label className="text-base font-semibold">Criativo Nº</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCreativeNumber(Math.max(1, creativeNumber - 1))}
            className="border-border"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-xl font-bold text-primary">
            {creativeNumber}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCreativeNumber(creativeNumber + 1)}
            className="border-border"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Formato</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>CTA</Label>
          <Select value={cta} onValueChange={setCta}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Call to Action" />
            </SelectTrigger>
            <SelectContent>
              {ctaOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Hook / Gancho</Label>
          <Input
            placeholder="Ex: Desconto, Urgência..."
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            className="bg-secondary border-border"
          />
        </div>
      </div>

      {result !== `C${creativeNumber}` && (
        <div className="space-y-3 animate-slide-up">
          <Label>Resultado</Label>
          <div className="result-box flex items-center justify-between gap-4">
            <span className="flex-1 text-foreground">{result}</span>
            <Button
              onClick={handleCopyAndSave}
              disabled={saving}
              className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>
      )}

      {user && <History key={`creatives-${clientId}-${refreshKey}`} type="creatives" clientId={clientId} onNextNumber={handleNextNumber} />}
    </div>
  );
};

export default CreativeGenerator;
