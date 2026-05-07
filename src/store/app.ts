import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Empresa } from "@/data/constants";

interface AppState {
  empresaFiltro: Empresa | "Todas";
  setEmpresaFiltro: (e: Empresa | "Todas") => void;
  theme: "fiat" | "viva";
  setTheme: (t: "fiat" | "viva") => void;
  dark: boolean;
  toggleDark: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      empresaFiltro: "Todas",
      setEmpresaFiltro: (empresaFiltro) => set({ empresaFiltro }),
      theme: "fiat",
      setTheme: (theme) => {
        document.documentElement.classList.toggle("theme-viva", theme === "viva");
        set({ theme });
      },
      dark: false,
      toggleDark: () =>
        set((s) => {
          const dark = !s.dark;
          document.documentElement.classList.toggle("dark", dark);
          return { dark };
        }),
    }),
    { name: "ceolin-app" }
  )
);
