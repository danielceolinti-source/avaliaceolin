import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export function PageStub({
  title, description, icon: Icon, children,
}: { title: string; description: string; icon: LucideIcon; children?: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center shadow-glow">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      {children ?? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-muted-foreground text-sm">Em construção — módulo já mapeado na arquitetura.</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
