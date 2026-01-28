"use client";

import * as React from "react";
import { Users, ChevronDown } from "lucide-react";
import { GroupMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface MemberFilterProps {
  members: GroupMember[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function MemberFilter({
  members,
  selectedIds,
  onSelectionChange,
  disabled = false,
}: MemberFilterProps) {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (userId: string) => {
    const newSelection = selectedIds.includes(userId)
      ? selectedIds.filter((id) => id !== userId)
      : [...selectedIds, userId];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    onSelectionChange(members.map((m) => m.user_id));
  };

  const handleClear = () => {
    onSelectionChange([]);
  };

  const getButtonLabel = () => {
    if (selectedIds.length === 0) {
      return "Alla medlemmar";
    }
    return `${selectedIds.length} av ${members.length} valda`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Filtrera efter medlem"
          className="h-10 justify-between"
          disabled={disabled}
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{getButtonLabel()}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Sok medlem..." />
          <div className="flex items-center justify-between border-b px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={handleSelectAll}
            >
              Valj alla
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={handleClear}
            >
              Rensa
            </Button>
          </div>
          <CommandList>
            <CommandEmpty>Ingen medlem hittades</CommandEmpty>
            {members.map((member) => {
              const isSelected = selectedIds.includes(member.user_id);
              return (
                <CommandItem
                  key={member.user_id}
                  value={member.name}
                  onSelect={() => handleToggle(member.user_id)}
                  className="h-10 cursor-pointer"
                >
                  <Checkbox
                    checked={isSelected}
                    className="mr-2"
                    aria-hidden="true"
                  />
                  <span>{member.name}</span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
