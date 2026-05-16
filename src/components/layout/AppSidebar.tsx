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
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { 
    canViewStrategic, canCreateAssessment, canManageUsers, 
    canManageVendors, canViewAudit, isSuperAdmin, isTI, isGestor 
  } = useRole();

  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  const mainItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, visible: canViewStrategic },
    { title: "Nova Avaliação", url: "/nova", icon: PlusCircle, visible: canCreateAssessment },
    { title: "Avaliações", url: "/avaliacoes", icon: ClipboardList, visible: true },
    { title: "Veículos Comprados", url: "/comprados", icon: Car, visible: true },
    { title: "Relatórios", url: "/relatorios", icon: BarChart3, visible: canViewStrategic },
  ].filter(i => i.visible);

  const adminItems = [
    { title: "Configurações", url: "/configuracoes", icon: Settings, visible: isTI || isSuperAdmin || isGestor || canManageUsers || canManageVendors },
  ].filter(i => i.visible);

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border glass shadow-xl transition-premium">
      <SidebarHeader className="border-b border-sidebar-border h-16 px-2 py-3 flex flex-row items-center justify-center gap-3 overflow-hidden shadow-sm">
        <div className={cn("h-10 flex items-center justify-center shrink-0 transition-all", collapsed ? "w-8" : "w-auto")}>
          <img src="/logos/ceolin_login.png" alt="Ceolin" className="h-8 w-auto object-contain" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="font-display font-bold text-sm tracking-tighter text-sidebar-foreground">SEMINOVOS</div>
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
