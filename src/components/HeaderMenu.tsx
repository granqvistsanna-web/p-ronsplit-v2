import { Upload, MoreVertical, Smartphone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface HeaderMenuProps {
  onImportClick: () => void;
  onSwishClick: () => void;
}

export function HeaderMenu({ onImportClick, onSwishClick }: HeaderMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreVertical size={18} />
          <span className="sr-only">Fler alternativ</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onSwishClick}>
          <Smartphone size={16} className="mr-2" />
          Lägg till Swish
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImportClick}>
          <Upload size={16} className="mr-2" />
          Importera transaktioner
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
