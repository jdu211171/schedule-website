import { Badge } from "@/components/ui/badge";

interface TypeBadgeProps {
  type: string;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <div className="w-32">
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        {type}
      </Badge>
    </div>
  );
}
