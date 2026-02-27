import { useState, useEffect } from "react";
import { Copy, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import History from "./History";

interface CampaignGeneratorProps {
  clientId: string;
}

const CampaignGenerator = ({ clientId }: CampaignGeneratorProps) => {
  const [campaignName, setCampaignName] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("");
  const [budgetType, setBudgetType] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  const campaignObjectives = [
    "Formulário Instantâneo",
    "Tráfego",
    "Conversão",
    "Engajamento",
    "Alcance",
    "Reconhecimento",
    "Vídeo Views",
    "Mensagens",
    "Cadastro",
    "Vendas",
  ];

  // Reset fields when client changes
  useEffect(() => {
    setCampaignName("");
    setCampaignObjective("");
    setBudgetType("");
    setRefreshKey((k) => k + 1);
  }, [clientId]);

  const generateResult = () => {
    const parts = ["[Syra]"];
    if (campaignName) parts.push(campaignName);
    if (campaignObjective) parts.push(`[${campaignObjective}]`);
    if (budgetType) parts.push(`[${budgetType}]`);
    return parts.join(" ");
  };

  const result = generateResult();

  const handleCopyAndSave = async () => {
    if (!result || result === "[Syra]") return;
    
    // Copy to clipboard
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);

    // Auto-save if user is logged in
    if (user) {
      setSaving(true);
      const { error } = await supabase.from("generated_campaigns").insert({
        user_id: user.id,
        client_id: clientId,
        name: result,
        campaign_type: campaignObjective,
        company_name: "Syra",
        campaign_objective: budgetType,
      });

      if (error) {
        toast.error("Erro ao salvar campanha");
      } else {
        setRefreshKey((k) => k + 1);
        // Reset fields after saving
        setCampaignName("");
        setCampaignObjective("");
        setBudgetType("");
      }
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="campaignName">Nome da Campanha</Label>
          <Input
            id="campaignName"
            placeholder="Ex: Black Friday 2024"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="bg-secondary border-border"
          />
        </div>

        <div className="space-y-2">
          <Label>Objetivo de Campanha</Label>
          <Select value={campaignObjective} onValueChange={setCampaignObjective}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Selecione o objetivo" />
            </SelectTrigger>
            <SelectContent>
              {campaignObjectives.map((objective) => (
                <SelectItem key={objective} value={objective}>
                  {objective}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tipo de Orçamento</Label>
          <Select value={budgetType} onValueChange={setBudgetType}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="CBO ou ABO" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CBO">CBO (Campaign Budget)</SelectItem>
              <SelectItem value="ABO">ABO (Ad Set Budget)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {result !== "[Syra]" && (
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

      {user && <History key={`campaigns-${clientId}-${refreshKey}`} type="campaigns" clientId={clientId} />}
    </div>
  );
};

export default CampaignGenerator;
