import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, PlusCircle, Car, BarChart3,
  Users, Shield, Settings, FileSearch,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Nova Avaliação", url: "/nova", icon: PlusCircle, highlight: true },
  { title: "Avaliações", url: "/avaliacoes", icon: ClipboardList },
  { title: "Veículos Comprados", url: "/comprados", icon: Car },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

const admin = [
  { title: "Usuários", url: "/usuarios", icon: Users },
  { title: "Auditoria", url: "/auditoria", icon: FileSearch },
  { title: "Logs", url: "/logs", icon: Shield },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border h-14 px-4 flex flex-row items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-gradient-primary grid place-items-center text-primary-foreground font-display font-bold shadow-glow shrink-0">
          C
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="font-display font-bold text-sidebar-foreground">Avalia Ceolin</div>
            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">Grupo Ceolin</div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel>Operacional</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {admin.map((item) => (
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
