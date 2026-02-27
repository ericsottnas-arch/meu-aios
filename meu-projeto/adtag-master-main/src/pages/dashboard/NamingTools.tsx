import { useClient } from "@/contexts/ClientContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Target, Users, Palette } from "lucide-react";
import CampaignGenerator from "@/components/CampaignGenerator";
import AudienceGenerator from "@/components/AudienceGenerator";
import CreativeGenerator from "@/components/CreativeGenerator";

const NamingTools = () => {
  const { selectedClient } = useClient();

  if (!selectedClient) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <Alert className="border-primary/30 bg-primary/5">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            Selecione um cliente no menu lateral para começar a gerar naming tools.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-fade-in max-w-4xl pb-12">
      {/* Client Badge */}
      <div className="syra-badge sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-2 -mt-2">
        Cliente: {selectedClient.name}
      </div>

      {/* Campaign Section */}
      <section id="campaign" className="scroll-mt-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Gerador de Campanha</h2>
            <p className="text-muted-foreground text-sm">
              Configure os parâmetros da sua campanha
            </p>
          </div>
        </div>
        <CampaignGenerator clientId={selectedClient.id} />
      </section>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Audience Section */}
      <section id="audience" className="scroll-mt-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Gerador de Público</h2>
            <p className="text-muted-foreground text-sm">
              Defina as características do público-alvo
            </p>
          </div>
        </div>
        <AudienceGenerator clientId={selectedClient.id} />
      </section>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Creative Section */}
      <section id="creative" className="scroll-mt-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Gerador de Criativo</h2>
            <p className="text-muted-foreground text-sm">
              Configure os atributos do criativo
            </p>
          </div>
        </div>
        <CreativeGenerator clientId={selectedClient.id} />
      </section>
    </div>
  );
};

export default NamingTools;
