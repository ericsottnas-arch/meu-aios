import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Client {
  id: string;
  name: string;
  created_at: string;
}

interface ClientContextType {
  clients: Client[];
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  loading: boolean;
  refreshClients: () => Promise<void>;
  addClient: (name: string) => Promise<{ error: Error | null }>;
  deleteClient: (id: string) => Promise<{ error: Error | null }>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchClients = async () => {
    if (!user) {
      setClients([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (!error && data) {
      setClients(data);
      // If there was a selected client, update it with fresh data
      if (selectedClient) {
        const updated = data.find((c) => c.id === selectedClient.id);
        if (updated) {
          setSelectedClient(updated);
        } else {
          setSelectedClient(null);
        }
      }
    }
    setLoading(false);
  };

  const addClient = async (name: string) => {
    if (!user) return { error: new Error("Usuário não autenticado") };

    const { data, error } = await supabase
      .from("clients")
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single();

    if (!error && data) {
      await fetchClients();
      setSelectedClient(data);
    }

    return { error: error as Error | null };
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (!error) {
      await fetchClients();
      if (selectedClient?.id === id) {
        setSelectedClient(null);
      }
    }

    return { error: error as Error | null };
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  return (
    <ClientContext.Provider
      value={{
        clients,
        selectedClient,
        setSelectedClient,
        loading,
        refreshClients: fetchClients,
        addClient,
        deleteClient,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
};
