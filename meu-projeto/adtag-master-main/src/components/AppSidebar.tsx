import { Target, Users, Palette, UserPlus, ChevronDown, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useClient } from "@/contexts/ClientContext";
import { useScrollSpyContext } from "@/contexts/ScrollSpyContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const namingItems = [
  { title: "Campanha", sectionId: "campaign", icon: Target },
  { title: "Público", sectionId: "audience", icon: Users },
  { title: "Criativo", sectionId: "creative", icon: Palette },
];

const adminItems = [
  { title: "Clientes", url: "/dashboard/clients", icon: UserPlus },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { clients, selectedClient, setSelectedClient } = useClient();
  const { activeSection, scrollToSection } = useScrollSpyContext();

  const isNamingToolsPage = location.pathname === "/dashboard" || location.pathname === "/dashboard/tools";
  const isClientsPage = location.pathname === "/dashboard/clients";

  const handleSectionClick = (sectionId: string) => {
    if (!isNamingToolsPage) {
      // If not on naming tools page, navigate there first
      window.location.href = `/dashboard/tools#${sectionId}`;
    } else {
      scrollToSection(sectionId);
    }
  };

  return (
    <Sidebar className={cn("border-r border-sidebar-border", collapsed ? "w-14" : "w-64")}>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">Syra</span>
          {!collapsed && <span className="text-xl font-light text-foreground">Digital</span>}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        {/* Client Selector */}
        {!collapsed && (
          <div className="mb-4 px-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between bg-secondary border-border hover:bg-muted"
                >
                  <span className="truncate">
                    {selectedClient ? selectedClient.name : "Selecionar cliente"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-popover border-border">
                {clients.length === 0 ? (
                  <DropdownMenuItem disabled>
                    Nenhum cliente cadastrado
                  </DropdownMenuItem>
                ) : (
                  clients.map((client) => (
                    <DropdownMenuItem
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={cn(
                        selectedClient?.id === client.id && "bg-primary/10 text-primary"
                      )}
                    >
                      {client.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Naming Tools */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            Naming Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {namingItems.map((item) => {
                const isActive = isNamingToolsPage && activeSection === item.sectionId;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={() => handleSectionClick(item.sectionId)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full text-left",
                          isActive
                            ? "bg-primary/10 text-primary border-l-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            Administração
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                        isClientsPage
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {user && !collapsed && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
