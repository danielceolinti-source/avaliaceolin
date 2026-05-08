import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, PlusCircle, Car, BarChart3,
  Users, Shield, Settings, FileSearch, UserCog,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useRole } from "@/hooks/useRole";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { 
    canViewDashboards, canCreateAssessment, canManageUsers, 
    canManageVendors, canViewAudit, isSuperAdmin, isTI, isGestor 
  } = useRole();

  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  const mainItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, visible: canViewDashboards },
    { title: "Nova Avaliação", url: "/nova", icon: PlusCircle, visible: canCreateAssessment },
    { title: "Avaliações", url: "/avaliacoes", icon: ClipboardList, visible: true },
    { title: "Veículos Comprados", url: "/comprados", icon: Car, visible: true },
    { title: "Relatórios", url: "/relatorios", icon: BarChart3, visible: canViewDashboards },
  ].filter(i => i.visible);

  const adminItems = [
    { title: "Usuários", url: "/usuarios", icon: Users, visible: canManageUsers },
    { title: "Vendedores", url: "/vendedores", icon: UserCog, visible: canManageVendors },
    { title: "Auditoria", url: "/auditoria", icon: FileSearch, visible: canViewAudit },
    { title: "Logs", url: "/logs", icon: Shield, visible: canViewAudit },
    { title: "Configurações", url: "/configuracoes", icon: Settings, visible: isTI || isSuperAdmin },
  ].filter(i => i.visible);

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border h-14 px-4 flex flex-row items-center gap-2 overflow-hidden">
        <div className="h-8 w-auto flex items-center justify-center shrink-0">
          <img src="/logos/ceolin_login.png" alt="Ceolin" className="h-6 w-auto object-contain" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="font-display font-bold text-xs text-sidebar-foreground">GRUPO CEOLIN</div>
            <div className="text-[9px] uppercase tracking-widest text-sidebar-foreground/50">Avaliação Técnica</div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel>Operacional</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} end={item.url === "/"}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
            v1.0 • Premium
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
