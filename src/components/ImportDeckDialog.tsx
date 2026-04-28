import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportedDeckData {
  title: string;
  cards: { term: string; definition: string }[];
}

interface ImportDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ImportedDeckData) => void;
}

export function ImportDeckDialog({ open, onOpenChange, onImport }: ImportDeckDialogProps) {
  const [preview, setPreview] = useState<ImportedDeckData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deckTitle, setDeckTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const parseAndPreview = (raw: string) => {
    setError(null);
    setPreview(null);

    try {
      const parsed = JSON.parse(raw);

      let title = "";
      let cards: { term: string; definition: string }[] = [];

      if (Array.isArray(parsed)) {
        // Array of {term, definition}
        cards = parsed
          .filter((item: unknown) => typeof item === "object" && item !== null && "term" in (item as Record<string, unknown>) && "definition" in (item as Record<string, unknown>))
          .map((item: Record<string, unknown>) => ({
            term: String(item.term ?? ""),
            definition: String(item.definition ?? ""),
          }));
        title = `Imported Deck (${cards.length} cards)`;
      } else if (typeof parsed === "object" && parsed !== null) {
        // Full deck object
        title = String((parsed as Record<string, unknown>).title ?? "Imported Deck");
        const rawCards = (parsed as Record<string, unknown>).cards;
        if (Array.isArray(rawCards)) {
          cards = rawCards
            .filter((item: unknown) => typeof item === "object" && item !== null && "term" in (item as Record<string, unknown>) && "definition" in (item as Record<string, unknown>))
            .map((item: Record<string, unknown>) => ({
              term: String(item.term ?? ""),
              definition: String(item.definition ?? ""),
            }));
        }
      }

      if (cards.length === 0) {
        setError("No valid cards found in JSON. Expected format: { title, cards: [{term, definition}] }");
        return;
      }

      setPreview({ title, cards });
      setDeckTitle(title);
    } catch {
      setError("Invalid JSON. Please check the file format.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      parseAndPreview(event.target?.result as string);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSubmit = () => {
    if (!preview) return;
    onImport({
      title: deckTitle.trim() || preview.title,
      cards: preview.cards,
    });
    setPreview(null);
    setError(null);
    setDeckTitle("");
    onOpenChange(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      parseAndPreview(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] gap-6 p-6 bg-background border-border/50 shadow-2xl">
        <div className="flex items-center gap-2">
          <Upload className="size-5 text-foreground" />
          <DialogTitle className="text-xl font-bold">Import JSON Deck</DialogTitle>
        </div>
        <DialogDescription className="text-sm text-muted-foreground">
          Upload a JSON file to import a deck. Supports exported deck format or an array of {"{term, definition}"} objects.
        </DialogDescription>

        <input
          type="file"
          accept=".json"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />

        {!preview ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-primary/50 hover:bg-secondary/30"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="p-4 rounded-full bg-secondary/50">
              <FileJson className="size-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">
                Drop a JSON file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Accepts .json files
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deck-title" className="text-sm font-medium">
                Deck Title
              </Label>
              <Input
                id="deck-title"
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                className="bg-secondary/30 border-border"
              />
            </div>

            <div className="rounded-lg border border-border/50 p-4 bg-secondary/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cards</span>
                <span className="text-sm font-semibold text-emerald-400">
                  {preview.cards.length}
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                {preview.cards.slice(0, 5).map((card, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="shrink-0 w-5 text-xs text-muted-foreground/50">
                      {i + 1}
                    </span>
                    <span className="truncate flex-1">{card.term}</span>
                    <span className="text-muted-foreground/30">→</span>
                    <span className="truncate flex-1">{card.definition}</span>
                  </div>
                ))}
                {preview.cards.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    +{preview.cards.length - 5} more cards
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setPreview(null);
              setError(null);
              setDeckTitle("");
            }}
            className="bg-secondary hover:bg-secondary/80 text-sm"
          >
            Clear
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!preview || preview.cards.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6"
          >
            Import Deck
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
