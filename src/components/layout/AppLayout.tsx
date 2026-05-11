import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card/80 backdrop-blur sticky top-0 z-30 flex items-center gap-2 px-3 md:px-5">
            <SidebarTrigger />
            <div className="flex-1 flex items-center min-w-0">
              <Topbar />
            </div>
          </header>
          <main className="flex-1 p-3 md:p-6 max-w-[1600px] w-full mx-auto overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
