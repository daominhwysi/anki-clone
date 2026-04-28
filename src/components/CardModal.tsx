import { useState, useEffect, useRef, useCallback } from "react";
import { AlignLeft, Eye, EyeOff } from "lucide-react";
import type { Deck, Flashcard, CardType } from "../types";
import { parseCloze, hasClozeMarkers } from "../lib/cloze";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface CardModalProps {
  deck: Deck;
  initialCard?: Flashcard;
  onSave: (card: Flashcard) => void;
  onCancel: () => void;
}

export function CardModal({ deck, initialCard, onSave, onCancel }: CardModalProps) {
  const detectedType: CardType = initialCard?.cardType || (initialCard?.term && hasClozeMarkers(initialCard.term) ? 'cloze' : 'standard');
  const [cardType, setCardType] = useState<CardType>(detectedType);
  const [front, setFront] = useState(initialCard?.term || "");
  const [back, setBack] = useState(initialCard?.definition || "");
  const frontRef = useRef<HTMLTextAreaElement>(null);

  const isEditing = !!initialCard;

  useEffect(() => {
    const timer = setTimeout(() => {
      frontRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = useCallback(() => {
    if (cardType === 'cloze') {
      if (!front.trim()) return;
      if (!hasClozeMarkers(front)) return;
    } else {
      if (!front.trim() && !back.trim()) return;
    }

    onSave({
      id: initialCard?.id || crypto.randomUUID(),
      term: front.trim(),
      definition: back.trim(),
      cardType,
    });

    if (!isEditing) {
      setFront("");
      setBack("");
      frontRef.current?.focus();
    }
  }, [cardType, front, back, initialCard, isEditing, onSave]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const clozeTokens = cardType === 'cloze' ? parseCloze(front) : [];

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="min-w-[40vw] p-0 overflow-hidden sm:rounded-xl">
        <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="sr-only">
            {isEditing ? "Edit Card" : `Add New Card to ${deck.title}`}
          </DialogTitle>

          <div className="flex items-center gap-4">
            <ToggleGroup
              type="single"
              value={cardType}
              onValueChange={(v) => v && setCardType(v as CardType)}
            >
              <ToggleGroupItem value="standard" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Standard
              </ToggleGroupItem>
              <ToggleGroupItem value="cloze" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Cloze
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
              <kbd className="text-[10px] font-mono bg-muted border border-border px-1 py-0.5 rounded">ESC</kbd>
            </Button>

            <Button
              onClick={handleSave}
              variant="default"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              {isEditing ? "Save Changes" : "Save"}
              <div className="flex gap-0.5">
                <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-primary-foreground/10">CTRL</kbd>
                <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-primary-foreground/10">&crarr;</kbd>
              </div>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col divide-y">
          {cardType === 'standard' ? (
            <>
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <AlignLeft className="size-3" />
                  Front
                </div>
                <div className="relative">
                  <textarea
                    ref={frontRef}
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    rows={4}
                    className="w-full resize-none bg-muted/30 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring transition-all"
                    placeholder="Enter term..."
                  />
                </div>
              </div>

              <div className="px-4 pt-3 pb-4">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <AlignLeft className="size-3" />
                  Back
                </div>
                <textarea
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  rows={4}
                  className="w-full resize-none bg-muted/30 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring transition-all"
                  placeholder="Enter definition..."
                />
              </div>
            </>
          ) : (
            <>
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <EyeOff className="size-3" />
                  Cloze Text
                </div>
                <div className="relative">
                  <textarea
                    ref={frontRef}
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    rows={6}
                    className="w-full resize-none bg-muted/30 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring transition-all font-mono"
                    placeholder={`The {{c1::capital}} of France is {{c2::Paris::Eiffel Tower city}}.\n\nWrap hidden text in {{c1::answer}} syntax.\nAdd ::hint after to show a clue (optional).`}
                  />
                </div>
              </div>

              {clozeTokens.length > 0 && (
                <div className="px-4 py-3 bg-muted/10">
                  <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <Eye className="size-3" />
                    Preview
                  </div>
                  <div className="text-sm leading-relaxed">
                    {clozeTokens.map((token, i) =>
                      token.hidden ? (
                        <span key={i} className="inline-block bg-primary/20 text-primary font-semibold px-1.5 py-0.5 rounded border border-primary/30 mx-0.5">
                          {token.text}
                          {token.hint && (
                            <span className="text-[9px] text-primary/50 ml-0.5 italic">({token.hint})</span>
                          )}
                        </span>
                      ) : (
                        <span key={i}>{token.text}</span>
                      )
                    )}
                  </div>
                </div>
              )}


            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
