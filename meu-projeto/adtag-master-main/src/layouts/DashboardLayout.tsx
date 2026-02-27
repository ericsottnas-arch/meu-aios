import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { ClientProvider } from "@/contexts/ClientContext";
import { ScrollSpyProvider, useScrollSpyContext } from "@/contexts/ScrollSpyContext";

const DashboardContent = () => {
  const { containerRef } = useScrollSpyContext();

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col">
        <header className="h-14 flex items-center border-b border-border px-4">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        </header>
        <div 
          ref={containerRef}
          className="flex-1 p-6 overflow-auto"
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const DashboardLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <ClientProvider>
      <ScrollSpyProvider>
        <SidebarProvider>
          <DashboardContent />
        </SidebarProvider>
      </ScrollSpyProvider>
    </ClientProvider>
  );
};

export default DashboardLayout;
