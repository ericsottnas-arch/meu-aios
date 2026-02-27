import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, ArrowRight } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect logged in users to dashboard
  if (!loading && user) {
    navigate("/dashboard/tools");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl mx-auto animate-fade-in">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">
            <span className="text-primary">Syra</span>{" "}
            <span className="text-foreground">Digital</span>
          </h1>
        </div>

        {/* Hero */}
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Meta Ads{" "}
            <span className="text-gradient">Naming Tool</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Gere nomenclaturas padronizadas para suas campanhas, públicos e criativos do Meta Ads de forma organizada e escalável.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="syra-card">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-primary font-bold">C</span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">Campanhas</h3>
            <p className="text-sm text-muted-foreground">Nomenclatura padronizada para campanhas</p>
          </div>
          <div className="syra-card">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-primary font-bold">P</span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">Públicos</h3>
            <p className="text-sm text-muted-foreground">Códigos sequenciais para públicos-alvo</p>
          </div>
          <div className="syra-card">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-primary font-bold">Cr</span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">Criativos</h3>
            <p className="text-sm text-muted-foreground">Rastreamento de testes de criativos</p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : (
            <>
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Entrar
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="border-border hover:bg-muted"
              >
                Criar Conta
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Syra Digital. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Index;
