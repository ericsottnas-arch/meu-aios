import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface HistoryProps {
  type: "campaigns" | "audiences" | "creatives";
  clientId: string;
  onNextNumber?: (num: number) => void;
}

const History = ({ type, clientId, onNextNumber }: HistoryProps) => {
  const [items, setItems] = useState<Array<{ id: string; code?: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchHistory = async () => {
    if (!user || !clientId) return;

    let data: Array<{ id: string; code?: string; name: string }> | null = null;

    if (type === "campaigns") {
      const result = await supabase
        .from("generated_campaigns")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      data = result.data;
    } else if (type === "audiences") {
      const result = await supabase
        .from("generated_audiences")
        .select("id, code, name")
        .eq("user_id", user.id)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      data = result.data;
    } else {
      const result = await supabase
        .from("generated_creatives")
        .select("id, code, name")
        .eq("user_id", user.id)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      data = result.data;
    }

    setItems(data || []);
    
    // Calculate next number for audiences/creatives
    if (type !== "campaigns" && onNextNumber && data) {
      const maxNum = data.reduce((max, item) => {
        const code = item.code || "";
        const match = code.match(/^[PC](\d+)/);
        const num = match ? parseInt(match[1], 10) : 0;
        return Math.max(max, num);
      }, 0);
      onNextNumber(maxNum + 1);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [user, type, clientId]);

  const handleDelete = async (id: string) => {
    let error = null;
    
    if (type === "campaigns") {
      const result = await supabase.from("generated_campaigns").delete().eq("id", id);
      error = result.error;
    } else if (type === "audiences") {
      const result = await supabase.from("generated_audiences").delete().eq("id", id);
      error = result.error;
    } else {
      const result = await supabase.from("generated_creatives").delete().eq("id", id);
      error = result.error;
    }

    if (error) {
      toast.error("Erro ao excluir item");
      return;
    }

    toast.success("Item excluído");
    fetchHistory();
  };

  const handleCopy = async (name: string, id: string) => {
    await navigator.clipboard.writeText(name);
    setCopiedId(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando histórico...</div>;
  }

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground">Nenhum item no histórico deste cliente</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Histórico ({items.length})</h3>
      <ScrollArea className="h-48 rounded-md border border-border p-2">
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/50 hover:bg-secondary transition-colors group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {item.code && (
                  <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border-primary/20">
                    {item.code}
                  </Badge>
                )}
                <span className="text-sm truncate text-foreground">{item.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleCopy(item.name, item.id)}
                >
                  {copiedId === item.id ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default History;
