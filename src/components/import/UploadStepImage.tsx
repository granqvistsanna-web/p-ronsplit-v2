/**
 * Image upload drop zone component for bank statement screenshots
 */

import { useCallback, useRef, useState } from "react";
import { Image, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UploadStepImageProps {
  onImageSelected: (file: File) => void;
}

export function UploadStepImage({ onImageSelected }: UploadStepImageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(
    (file: File) => {
      const isImage = file.type.startsWith("image/");
      if (!isImage) {
        toast.error("Endast bilder stöds (PNG, JPG, etc.)");
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Bilden är för stor. Max 10MB.");
        return;
      }

      onImageSelected(file);
    },
    [onImageSelected]
  );

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageUpload(file);
    },
    [handleImageUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleImageUpload(file);
    },
    [handleImageUpload]
  );

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 sm:p-16 text-center transition-all duration-200
          ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
          }
        `}
      >
        <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
          <Image size={28} className="text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-foreground mb-2">
          Släpp en skärmdump här
        </p>
        <p className="text-muted-foreground mb-6">PNG, JPG eller skärmklipp</p>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload">
          <Button
            variant="outline"
            size="lg"
            className="cursor-pointer h-11 px-6"
            asChild
          >
            <span>Välj bild</span>
          </Button>
        </label>
      </div>
      <div className="flex items-center justify-center gap-2 mt-4">
        <Sparkles size={14} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          AI läser av transaktionerna automatiskt
        </p>
      </div>
    </>
  );
}
