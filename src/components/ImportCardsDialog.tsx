import { useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Download, FileUp, Braces, Type } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { hasClozeMarkers, stripCloze } from "@/lib/cloze";

interface ImportCardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (cards: { term: string; definition: string }[]) => void;
}

type TabType = "csv" | "text";

function detectCardType(term: string): "standard" | "cloze" {
  return hasClozeMarkers(term) ? "cloze" : "standard";
}

function SidebarItem({ id, label, activeTab, onSelect }: { id: TabType; label: string; activeTab: TabType; onSelect: (id: TabType) => void }) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={cn(
        "w-full text-left px-4 py-3 text-sm font-medium transition-colors rounded-md",
        activeTab === id
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {label}
    </button>
  );
}

function CardTypeBadge({ type }: { type: "standard" | "cloze" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0",
        type === "cloze"
          ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
          : "bg-muted text-muted-foreground border border-border/50"
      )}
    >
      {type === "cloze" ? <Braces className="size-3" /> : <Type className="size-3" />}
      {type === "cloze" ? "Cloze" : "Standard"}
    </span>
  );
}

export function ImportCardsDialog({ open, onOpenChange, onImport }: ImportCardsDialogProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabType>("csv");

  // CSV State
  const [csvSeparator, setCsvSeparator] = useState(",");
  const [csvQuote, setCsvQuote] = useState("none");
  const [csvRawContent, setCsvRawContent] = useState("");

  // Text State
  const [importText, setImportText] = useState("");
  const [cardSeparator, setCardSeparator] = useState("\\n");
  const [sideSeparator, setSideSeparator] = useState("\\t");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple CSV Parser
  const parseCSV = (text: string, separator: string, quote: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      let parts: string[] = [];
      if (quote === "none") {
        parts = line.split(separator === "tab" ? "\t" : separator);
      } else {
        const regex = new RegExp(`(${quote}[^${quote}]*${quote}|[^${separator}]+)`, 'g');
        const matches = line.match(regex);
        parts = matches ? matches.map(m => m.replace(new RegExp(quote, 'g'), '')) : [];
      }
      return {
        term: parts[0]?.trim() || "",
        definition: parts.slice(1).join(" ").trim() || ""
      };
    }).filter(c => c.term || c.definition);
  };

  // Text Parser
  const parseText = (text: string, cardSep: string, sideSep: string) => {
    if (!text.trim()) return [];
    const unescape = (str: string) => str.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    const uCardSep = unescape(cardSep) || '\n';
    const uSideSep = unescape(sideSep) || '\t';

    return text
      .split(uCardSep)
      .map(line => {
        const parts = line.split(uSideSep);
        const term = parts[0]?.trim() || '';
        const definition = parts.slice(1).join(uSideSep)?.trim() || '';
        return { term, definition };
      })
      .filter(c => c.term || c.definition);
  };

  const parsedTextCards = useMemo(() => {
    if (activeTab === "text") {
      return parseText(importText, cardSeparator, sideSeparator);
    }
    return [];
  }, [activeTab, importText, cardSeparator, sideSeparator]);

  const csvCards = useMemo(() => {
    if (activeTab === "csv" && csvRawContent) {
      return parseCSV(csvRawContent, csvSeparator, csvQuote);
    }
    return [];
  }, [activeTab, csvRawContent, csvSeparator, csvQuote]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (activeTab === "csv") {
        setCsvRawContent(content);
      } else {
        setImportText(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const finalCards = activeTab === "text" ? parsedTextCards : csvCards;

  const standardCount = finalCards.filter(c => detectCardType(c.term) === "standard").length;
  const clozeCount = finalCards.filter(c => detectCardType(c.term) === "cloze").length;

  const submitImport = () => {
    if (finalCards.length > 0) {
      onImport(finalCards);
      setImportText("");
      setCsvRawContent("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[800px] h-[90vh] sm:h-[600px] overflow-hidden flex flex-col sm:flex-row bg-background border-border/50 shadow-2xl">

        {/* SIDEBAR */}
        {!isMobile && (
          <div className="w-[200px] bg-card flex flex-col p-4 gap-6 shrink-0 border-r border-border/50 h-full">
            <div className="flex items-center gap-2 px-2 py-2">
              <Download className="size-5 text-foreground" />
              <span className="text-xl font-bold tracking-tight">Import</span>
            </div>
            <nav className="flex flex-col gap-1">
              <SidebarItem id="csv" label="CSV" activeTab={activeTab} onSelect={setActiveTab} />
              <SidebarItem id="text" label="Text" activeTab={activeTab} onSelect={setActiveTab} />
            </nav>
          </div>
        )}

        {/* RIGHT SIDE */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* Header & Mobile Navigation */}
          <div className="px-6 pt-6 flex flex-col shrink-0 gap-4">
            <div className="flex justify-between items-center w-full">
              {!isMobile ? (
                <DialogTitle className="text-2xl font-bold">
                  {activeTab === "csv" ? "CSV Import Options" : "Text Import Options"}
                </DialogTitle>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="size-5 text-foreground" />
                  <span className="text-lg font-bold">Import</span>
                </div>
              )}
            </div>

            {isMobile && (
              <div className="flex border-b border-border/50">
                <button
                  onClick={() => setActiveTab("csv")}
                  className={cn(
                    "flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2",
                    activeTab === "csv"
                      ? "bg-secondary/50 text-foreground border-primary"
                      : "text-muted-foreground border-transparent hover:bg-secondary/20"
                  )}
                >
                  CSV
                </button>
                <button
                  onClick={() => setActiveTab("text")}
                  className={cn(
                    "flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2",
                    activeTab === "text"
                      ? "bg-secondary/50 text-foreground border-primary"
                      : "text-muted-foreground border-transparent hover:bg-secondary/20"
                  )}
                >
                  Text
                </button>
              </div>
            )}
          </div>

          {/* Scrollable Main Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {activeTab === "csv" ? (
              <div className="space-y-8">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Select a .csv file to begin importing. Learn more about importing CSV files <a href="#" className="text-primary hover:underline">here</a>.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-bold min-w-[80px]">Separator</Label>
                    <ToggleGroup
                      type="single"
                      value={csvSeparator}
                      onValueChange={(v) => v && setCsvSeparator(v)}
                      className="flex gap-2"
                    >
                      <ToggleGroupItem value="," className="h-8 px-4 rounded-md bg-secondary/80 hover:bg-secondary border border-transparent data-[state=on]:border-primary/50 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">,</ToggleGroupItem>
                      <ToggleGroupItem value=";" className="h-8 px-4 rounded-md bg-secondary/80 hover:bg-secondary border border-transparent data-[state=on]:border-primary/50 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">;</ToggleGroupItem>
                      <ToggleGroupItem value="tab" className="h-8 px-4 rounded-md bg-secondary/80 hover:bg-secondary border border-transparent data-[state=on]:border-primary/50 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">tab</ToggleGroupItem>
                      <ToggleGroupItem value="|" className="h-8 px-4 rounded-md bg-secondary/80 hover:bg-secondary border border-transparent data-[state=on]:border-primary/50 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">|</ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-bold min-w-[80px]">Quote</Label>
                    <ToggleGroup
                      type="single"
                      value={csvQuote}
                      onValueChange={(v) => v && setCsvQuote(v)}
                      className="flex gap-2"
                    >
                      <ToggleGroupItem value="none" className="h-8 px-4 rounded-md bg-secondary/80 hover:bg-secondary border border-transparent data-[state=on]:border-primary/50 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">none</ToggleGroupItem>
                      <ToggleGroupItem value='"' className="h-8 px-4 rounded-md bg-secondary/80 hover:bg-secondary border border-transparent data-[state=on]:border-primary/50 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">"</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>

                {csvCards.length > 0 && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-sm text-emerald-400 font-medium">
                        {csvCards.length} cards detected from file
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <CardTypeBadge type="standard" />
                        <span className="text-xs text-muted-foreground">{standardCount}</span>
                        <CardTypeBadge type="cloze" />
                        <span className="text-xs text-muted-foreground">{clozeCount}</span>
                      </div>
                    </div>

                    <div className="border border-border/30 rounded-lg overflow-hidden">
                      <div className="max-h-[180px] overflow-y-auto no-scrollbar divide-y divide-border/20">
                        {csvCards.slice(0, 50).map((card, i) => (
                          <div key={i} className="px-3 py-2 flex items-center gap-3 text-sm">
                            <CardTypeBadge type={detectCardType(card.term)} />
                            <span className="truncate flex-1 text-foreground">
                              {detectCardType(card.term) === "cloze" ? stripCloze(card.term) : card.term}
                            </span>
                            {card.definition && (
                              <span className="text-muted-foreground truncate max-w-[40%] hidden sm:inline">
                                {card.definition}
                              </span>
                            )}
                          </div>
                        ))}
                        {csvCards.length > 50 && (
                          <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                            ...and {csvCards.length - 50} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <Textarea
                  placeholder="Word 1\tDefinition 1\nWord 2\tDefinition 2"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="min-h-[200px] bg-secondary/30 border-border focus:ring-1 focus:ring-primary/50 resize-none p-4"
                />

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Between term and definition</Label>
                    <Input
                      value={sideSeparator}
                      onChange={(e) => setSideSeparator(e.target.value)}
                      className="bg-card border-none focus-visible:ring-1 focus-visible:ring-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Between cards</Label>
                    <Input
                      value={cardSeparator}
                      onChange={(e) => setCardSeparator(e.target.value)}
                      className="bg-card border-none focus-visible:ring-1 focus-visible:ring-border"
                    />
                  </div>
                </div>

                {parsedTextCards.length > 0 && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-sm text-emerald-400 font-medium">
                        {parsedTextCards.length} cards detected
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <CardTypeBadge type="standard" />
                        <span className="text-xs text-muted-foreground">{standardCount}</span>
                        <CardTypeBadge type="cloze" />
                        <span className="text-xs text-muted-foreground">{clozeCount}</span>
                      </div>
                    </div>

                    <div className="border border-border/30 rounded-lg overflow-hidden">
                      <div className="max-h-[180px] overflow-y-auto no-scrollbar divide-y divide-border/20">
                        {parsedTextCards.slice(0, 50).map((card, i) => (
                          <div key={i} className="px-3 py-2 flex items-center gap-3 text-sm">
                            <CardTypeBadge type={detectCardType(card.term)} />
                            <span className="truncate flex-1 text-foreground">
                              {detectCardType(card.term) === "cloze" ? stripCloze(card.term) : card.term}
                            </span>
                            {card.definition && (
                              <span className="text-muted-foreground truncate max-w-[40%] hidden sm:inline">
                                {card.definition}
                              </span>
                            )}
                          </div>
                        ))}
                        {parsedTextCards.length > 50 && (
                          <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                            ...and {parsedTextCards.length - 50} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="p-4 sm:p-6 border-t border-border/50 bg-card/30 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
            <input
              type="file"
              accept=".txt,.csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 sm:h-auto bg-secondary hover:bg-secondary/80 text-sm order-2 sm:order-1"
            >
              <FileUp className="size-4 mr-2" />
              Choose files
            </Button>
            <Button
              onClick={submitImport}
              disabled={finalCards.length === 0}
              className="h-10 sm:h-auto bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 order-1 sm:order-2"
            >
              Import {finalCards.length > 0 ? finalCards.length : ""} Cards
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
