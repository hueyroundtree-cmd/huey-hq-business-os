import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6 border border-dashed rounded-md bg-muted/30">
      <Icon className="h-8 w-8 mx-auto text-muted-foreground/60 mb-3" />
      <h3 className="text-sm font-medium">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
