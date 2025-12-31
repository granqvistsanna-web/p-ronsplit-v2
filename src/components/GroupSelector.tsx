import { Group } from "@/hooks/useGroups";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

interface GroupSelectorProps {
  groups: Group[];
  selectedGroupId: string | undefined;
  onSelectGroup: (groupId: string) => void;
}

export function GroupSelector({ groups, selectedGroupId, onSelectGroup }: GroupSelectorProps) {
  if (groups.length <= 1) {
    return null;
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <Select value={selectedGroupId} onValueChange={onSelectGroup}>
      <SelectTrigger className="h-8 px-2.5 gap-1.5 bg-secondary/50 border-0 hover:bg-secondary/80 transition-colors max-w-[140px] sm:max-w-[200px]">
        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate text-sm font-medium">
          {selectedGroup?.name || "Välj grupp"}
        </span>
      </SelectTrigger>
      <SelectContent align="start">
        {groups.map((group) => (
          <SelectItem key={group.id} value={group.id} className="max-w-[250px]">
            <span className="truncate">{group.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
