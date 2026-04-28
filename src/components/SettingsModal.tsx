import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Type } from "lucide-react";
import { cn } from "@/lib/utils";

const FONTS = [
  { name: "Inter", value: "Inter, sans-serif" },
  { name: "Open Sans", value: "'Open Sans', sans-serif" },
  { name: "Montserrat", value: "Montserrat, sans-serif" },
  { name: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif" },
  { name: "Roboto", value: "Roboto, sans-serif" },
];

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [currentFont, setCurrentFont] = useState("Inter, sans-serif");

  useEffect(() => {
    // 1. Lấy font đã lưu
    const savedFont = localStorage.getItem("app-font") || "Inter, sans-serif";
    setCurrentFont(savedFont);
    // 2. Áp dụng vào CSS Variable ngay khi load
    document.documentElement.style.setProperty('--app-font', savedFont);
  }, []);


  const handleFontChange = (fontValue: string) => {
    setCurrentFont(fontValue);
    // 3. Cập nhật CSS Variable (Toàn bộ app sẽ đổi font ngay lập tức)
    document.documentElement.style.setProperty('--app-font', fontValue);
    // 4. Lưu lại
    localStorage.setItem("app-font", fontValue);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="size-5" />
            Appearance Settings
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">
            Choose Font Family
          </h4>
          <div className="grid gap-2">
            {FONTS.map((font) => (
              <Button
                key={font.name}
                variant="outline"
                className={cn(
                  "justify-between h-12 text-base font-medium",
                  currentFont === font.value && "border-primary ring-1 ring-primary"
                )}
                style={{ fontFamily: font.value }}
                onClick={() => handleFontChange(font.value)}
              >
                {font.name}
                {currentFont === font.value && (
                  <Check className="size-4 text-primary" />
                )}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground mb-1 uppercase font-bold tracking-tighter">Preview</p>
          <p style={{ fontFamily: currentFont }} className="text-sm">
            The quick brown fox jumps over the lazy dog. 1234567890
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
