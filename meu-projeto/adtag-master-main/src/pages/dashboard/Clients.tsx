import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClient } from "@/contexts/ClientContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Clients = () => {
  const [newClientName, setNewClientName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { clients, addClient, deleteClient, setSelectedClient, selectedClient } = useClient();

  const handleAddClient = async () => {
    if (!newClientName.trim()) {
      toast.error("Digite o nome do cliente");
      return;
    }

    setIsAdding(true);
    const { error } = await addClient(newClientName);
    
    if (error) {
      toast.error("Erro ao cadastrar cliente");
    } else {
      toast.success("Cliente cadastrado com sucesso!");
      setNewClientName("");
    }
    setIsAdding(false);
  };

  const handleDeleteClient = async (id: string, name: string) => {
    const { error } = await deleteClient(id);
    
    if (error) {
      toast.error("Erro ao excluir cliente");
    } else {
      toast.success(`Cliente "${name}" excluído`);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seus clientes para organizar campanhas, públicos e criativos
        </p>
      </div>

      {/* Add Client Form */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Novo Cliente
          </CardTitle>
          <CardDescription>
            Cadastre um novo cliente para começar a gerar naming tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="clientName" className="sr-only">Nome do Cliente</Label>
              <Input
                id="clientName"
                placeholder="Nome do cliente"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddClient()}
                className="bg-secondary border-border"
              />
            </div>
            <Button
              onClick={handleAddClient}
              disabled={isAdding}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Clientes Cadastrados ({clients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum cliente cadastrado ainda</p>
              <p className="text-sm">Adicione seu primeiro cliente acima</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedClient?.id === client.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-secondary/50 hover:bg-secondary"
                  }`}
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Criado em {new Date(client.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedClient?.id === client.id && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Selecionado
                      </span>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso excluirá permanentemente o cliente "{client.name}" e todo o histórico
                            de campanhas, públicos e criativos associados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteClient(client.id, client.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Clients;
