import { useState, useEffect } from "react";
import { Copy, Check, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import History from "./History";

interface AudienceGeneratorProps {
  clientId: string;
}

const AudienceGenerator = ({ clientId }: AudienceGeneratorProps) => {
  const [audienceNumber, setAudienceNumber] = useState(1);
  const [gender, setGender] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [placements, setPlacements] = useState<string[]>([]);
  const [interest, setInterest] = useState("");
  const [customAudience, setCustomAudience] = useState("");
  const [location, setLocation] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  const placementOptions = ["FB", "IG", "MSG", "AN"];
  const genderOptions = ["Homens", "Mulheres", "Todos"];
  
  // Generate sequential age options from 18 to 65+
  const ageOptions = [
    ...Array.from({ length: 48 }, (_, i) => String(18 + i)),
    "65+"
  ];

  // Reset fields when client changes
  useEffect(() => {
    setGender("");
    setAgeMin("");
    setAgeMax("");
    setPlacements([]);
    setInterest("");
    setCustomAudience("");
    setLocation("");
    setRefreshKey((k) => k + 1);
  }, [clientId]);

  const togglePlacement = (placement: string) => {
    setPlacements((prev) =>
      prev.includes(placement)
        ? prev.filter((p) => p !== placement)
        : [...prev, placement]
    );
  };

  const generateResult = () => {
    const parts = [`P${audienceNumber}`];
    if (gender) parts.push(`[${gender}]`);
    if (ageMin && ageMax) parts.push(`[${ageMin}-${ageMax}]`);
    if (placements.length > 0) parts.push(`[${placements.join("+")}]`);
    if (interest) parts.push(`[Int: ${interest}]`);
    if (customAudience) parts.push(`[PP: ${customAudience}]`);
    if (location) parts.push(`[${location}]`);
    return parts.join(" ");
  };

  const result = generateResult();

  const handleCopyAndSave = async () => {
    if (!result || result === `P${audienceNumber}`) return;
    
    // Copy to clipboard
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);

    // Auto-save if user is logged in
    if (user) {
      setSaving(true);
      const { error } = await supabase.from("generated_audiences").insert({
        user_id: user.id,
        client_id: clientId,
        code: `P${audienceNumber}`,
        name: result,
        gender,
        positioning: placements.join("+"),
        age_range: ageMin && ageMax ? `${ageMin}-${ageMax}` : null,
        interest_targeting: !!interest,
        geolocation: location || null,
      });

      if (error) {
        toast.error("Erro ao salvar público");
      } else {
        setRefreshKey((k) => k + 1);
        // Increment number for next audience
        setAudienceNumber((n) => n + 1);
        // Reset fields
        setGender("");
        setAgeMin("");
        setAgeMax("");
        setPlacements([]);
        setInterest("");
        setCustomAudience("");
        setLocation("");
      }
      setSaving(false);
    }
  };

  const handleNextNumber = (num: number) => {
    setAudienceNumber(num);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Label className="text-base font-semibold">Público Nº</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAudienceNumber(Math.max(1, audienceNumber - 1))}
            className="border-border"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-xl font-bold text-primary">
            {audienceNumber}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAudienceNumber(audienceNumber + 1)}
            className="border-border"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Gênero</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {genderOptions.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Idade Mín.</Label>
          <Select value={ageMin} onValueChange={setAgeMin}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="De" />
            </SelectTrigger>
            <SelectContent>
              {ageOptions.map((age) => (
                <SelectItem key={age} value={age}>
                  {age}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Idade Máx.</Label>
          <Select value={ageMax} onValueChange={setAgeMax}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Até" />
            </SelectTrigger>
            <SelectContent>
              {ageOptions.map((age) => (
                <SelectItem key={age} value={age}>
                  {age}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Geolocalização</Label>
          <Input
            placeholder="Ex: São Paulo - SP"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="bg-secondary border-border"
          />
        </div>

        <div className="space-y-2">
          <Label>Interesse</Label>
          <Input
            placeholder="Ex: Marketing Digital"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            className="bg-secondary border-border"
          />
        </div>

        <div className="space-y-2">
          <Label>Público Personalizado</Label>
          <Input
            placeholder="Ex: Visitantes do site"
            value={customAudience}
            onChange={(e) => setCustomAudience(e.target.value)}
            className="bg-secondary border-border"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Posicionamentos</Label>
        <div className="flex flex-wrap gap-3">
          {placementOptions.map((placement) => (
            <label
              key={placement}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={placements.includes(placement)}
                onCheckedChange={() => togglePlacement(placement)}
              />
              <span className="text-sm text-foreground">{placement}</span>
            </label>
          ))}
        </div>
      </div>

      {result !== `P${audienceNumber}` && (
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

      {user && <History key={`audiences-${clientId}-${refreshKey}`} type="audiences" clientId={clientId} onNextNumber={handleNextNumber} />}
    </div>
  );
};

export default AudienceGenerator;
