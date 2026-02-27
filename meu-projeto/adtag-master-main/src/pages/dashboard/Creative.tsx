import { useClient } from "@/contexts/ClientContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import CreativeGenerator from "@/components/CreativeGenerator";

const Creative = () => {
  const { selectedClient } = useClient();

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gerador de Criativo</h1>
        <p className="text-muted-foreground mt-1">
          Configure os atributos do criativo para rastrear testes
        </p>
      </div>

      {!selectedClient ? (
        <Alert className="border-primary/30 bg-primary/5">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            Selecione um cliente no menu lateral para começar a gerar naming tools.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="syra-badge">
            Cliente: {selectedClient.name}
          </div>
          <CreativeGenerator clientId={selectedClient.id} />
        </>
      )}
    </div>
  );
};

export default Creative;
