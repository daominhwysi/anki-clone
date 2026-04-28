import { useMemo, useState } from "react";
import {
  Play, Plus, Search, MoreHorizontal,
  ArrowLeft, LayoutGrid, BookOpen, Trash2,
  ChevronRight, X, ChevronDown, Upload, Edit3, RotateCcw
} from "lucide-react";
import type { Deck, Flashcard } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { ImportCardsDialog } from "./ImportCardsDialog";
import { CardModal } from "./CardModal";
import { isCardDue } from "@/lib/srs";
import { stripCloze, previewClozeWithHints } from "@/lib/cloze";

type ViewMode = "grid" | "notebook";

interface DeckViewProps {
  deck: Deck;
  allDecks: Deck[];
  onBack: () => void;
  onStudy: (mode: "review" | "cram") => void;
  onAddCard: () => void;
  onUpdateCard: (cardId: string, updatedCard: Flashcard) => void;
  onDeleteCard: (cardId: string) => void;
  onImportCards?: (cards: { term: string; definition: string }[]) => void;
  onSelectDeck: (id: string) => void;
  onDeleteDeck: () => void;
  onNavigateToLibrary: (id: string | null) => void;
}

export function DeckView({
  deck,
  allDecks,
  onBack,
  onStudy,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onImportCards,
  onDeleteDeck,
  onNavigateToLibrary,
}: DeckViewProps) {
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("deck-view-mode");
    return (saved === "grid" || saved === "notebook") ? (saved as ViewMode) : "grid";
  });

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("deck-view-mode", mode);
  };



  const dueCards = useMemo(() => {
    return deck.cards.filter(isCardDue);
  }, [deck.cards]);

  const filtered = deck.cards.filter(
    (c) =>
      c.term.toLowerCase().includes(search.toLowerCase()) ||
      c.definition.toLowerCase().includes(search.toLowerCase())
  );

  const displayedCards = search ? filtered : deck.cards;

  const VIEW_MODES: { id: ViewMode; icon: React.ReactNode; label: string }[] = [
    { id: "grid", icon: <LayoutGrid className="size-3.5" />, label: "Grid View" },
    { id: "notebook", icon: <BookOpen className="size-3.5" />, label: "Notebook View" },
  ];

  // Menu thao tác cho từng thẻ
  const CardActions = ({ card }: { card: Flashcard }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => setEditingCard(card)} className="gap-2">
          <Edit3 className="size-3.5" /> Edit Card
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive font-medium gap-2"
          onClick={() => onDeleteCard(card.id)}
        >
          <Trash2 className="size-3.5" /> Delete Card
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const breadcrumbs = useMemo(() => {
    const list: Deck[] = [deck];
    let cur = deck.parentId ? allDecks.find((d) => d.id === deck.parentId) : null;
    while (cur) {
      list.unshift(cur);
      cur = cur.parentId ? allDecks.find((d) => d.id === cur!.parentId) : null;
    }
    return list;
  }, [allDecks, deck, deck.parentId]);
  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-background text-foreground overflow-y-auto">
        {/* HEADER */}
        <header className="shrink-0 flex flex-col sm:flex-row sm:items-center px-4 py-2 sm:py-0 sm:h-12 border-b border-border sticky top-0 bg-background z-10 gap-2 sm:gap-0">
          <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-4 mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onBack} className="size-8 shrink-0">
                    <ArrowLeft className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Go back</TooltipContent>
              </Tooltip>
              <nav className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar select-none">
                {breadcrumbs.map((crumb, index) => (
                  <span key={crumb.id} className="flex items-center gap-1 shrink-0">
                    {index > 0 && (
                      <ChevronRight className="size-3.5 text-muted-foreground/50" />
                    )}

                    <button
                      onClick={() => onNavigateToLibrary(crumb.id)}
                      disabled={crumb.id === deck.id}
                      className={cn(
                        "text-sm transition-colors truncate max-w-[120px]",
                        crumb.id === deck.id
                          ? "text-foreground font-semibold cursor-default"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {crumb.title}
                    </button>
                  </span>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            {showSearch ? (
              <div className="flex items-center gap-1 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Search cards…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-full sm:w-48 pl-8 pr-8 text-sm"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => { setShowSearch(false); setSearch(""); }}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" size="icon" className="size-8 hidden sm:flex" onClick={() => setShowSearch(true)}>
                  <Search className="size-4" />
                </Button>
                <div className="flex items-center -space-x-px w-full sm:w-auto">
                  {dueCards.length > 0 ? (
                    <>
                      <Button
                        onClick={() => onStudy("review")}
                        variant="default"
                        size="sm"
                        className="h-8 gap-2 font-semibold px-3 rounded-r-none focus:z-10 shadow-sm flex-1 sm:flex-none justify-center"
                      >
                        <Play className="size-3.5 fill-current" />
                        <span>Review</span>
                        <span className="opacity-60 text-[10px] font-mono leading-none bg-primary-foreground/20 px-1 rounded-sm">
                          {dueCards.length}
                        </span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="default" size="sm" className="h-8 w-8 px-0 rounded-l-none focus:z-10 shadow-sm border-l border-primary-foreground/20">
                            <ChevronDown className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onStudy("cram")} disabled={deck.cards.length === 0} className="gap-2">
                            <RotateCcw className="size-3.5" />
                            <div className="flex flex-col">
                              <span className="font-medium text-xs">Cram Mode</span>
                              <span className="text-[10px] text-muted-foreground">Study all {deck.cards.length} cards</span>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => onStudy("cram")}
                        variant="default"
                        size="sm"
                        disabled={deck.cards.length === 0}
                        className="h-8 gap-2 font-semibold px-3 rounded-r-none focus:z-10 shadow-sm flex-1 sm:flex-none justify-center"
                      >
                        <RotateCcw className="size-3.5" />
                        <span>Cram Mode</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="default" size="sm" className="h-8 w-8 px-0 rounded-l-none focus:z-10 shadow-sm border-l border-primary-foreground/20">
                            <ChevronDown className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem disabled className="gap-2 opacity-50 cursor-not-allowed">
                            <Play className="size-3.5" />
                            <div className="flex flex-col">
                              <span className="font-medium text-xs">Review Due Cards</span>
                              <span className="text-[10px] text-muted-foreground">No cards scheduled</span>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </>
            )}
            <div className="hidden sm:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={onAddCard} className="gap-2"><Plus className="size-3.5" /> New Card</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowImportDialog(true)} className="gap-2"><Upload className="size-3.5" /> Import Cards</DropdownMenuItem>
                  <Separator className="my-1" />
                  <DropdownMenuItem className="text-destructive gap-2" onClick={onDeleteDeck}><Trash2 className="size-3.5" /> Remove </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* TOOLBAR */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-border/50 bg-muted/5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-semibold">
                {VIEW_MODES.find((v) => v.id === viewMode)?.icon}
                <span>{VIEW_MODES.find((v) => v.id === viewMode)?.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {VIEW_MODES.map(({ id, icon, label }) => (
                <DropdownMenuItem key={id} onClick={() => handleViewChange(id)} className={cn(viewMode === id && "bg-muted font-medium")}>
                  {icon} <span className="ml-2">{label}</span>
                  {viewMode === id && <span className="ml-auto text-muted-foreground">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex inline-flex -space-x-px rounded-md shadow-sm">
            <Button variant="outline" size="sm" onClick={onAddCard} className="h-8 gap-2 text-xs font-bold rounded-r-none focus:z-10 w-8 px-0 sm:w-auto sm:px-3">
              <Plus className="size-3.5" /> <span className="hidden sm:inline">New Card</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 px-0 rounded-l-none focus:z-10">
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowImportDialog(true)} className="gap-2"><Upload className="size-3.5" /> Import Cards</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* CARD LIST */}
        <div className="p-4 md:p-6 space-y-6">
          {displayedCards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-50">
              <Search className="size-12 text-muted-foreground/30" />
              <p className="text-lg font-medium">{search ? `No cards matching "${search}"` : "This deck is empty"}</p>
              {!search && <Button variant="outline" onClick={onAddCard} className="gap-2"><Plus className="size-4" /> Create First Card</Button>}
            </div>
          )}

          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedCards.map((card) => {
                const isCloze = card.cardType === 'cloze';
                const termDisplay = isCloze ? previewClozeWithHints(card.term) : card.term;
                const definitionDisplay = isCloze ? stripCloze(card.term) : card.definition;
                const hasDefinition = definitionDisplay.trim().length > 0;

                return (
                  <Card key={card.id} className="flex flex-col bg-muted/10 border border-border/40 hover:border-border/80 transition-all group rounded-xl overflow-hidden">
                    <CardContent className="p-0 flex flex-col h-full">
                      <div className={`flex items-center justify-between px-4 pt-4 ${hasDefinition ? 'pb-3 border-b border-border/30' : 'pb-4'}`}>
                        <h3 className={`font-[500] text-sm text-foreground mr-2 ${hasDefinition ? 'truncate' : ''}`}>{termDisplay}</h3>
                        <CardActions card={card} />
                      </div>
                      {hasDefinition && (
                        <div className="px-4 py-4 flex-1 text-sm leading-snug">
                          <p className="text-muted-foreground line-clamp-4">{definitionDisplay}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {viewMode === "notebook" && (
            <div className="max-w-none space-y-0 relative pl-10">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-border/40" />
              {displayedCards.map((card) => {
                const isCloze = card.cardType === 'cloze';
                const termDisplay = isCloze ? previewClozeWithHints(card.term) : card.term;
                const definitionDisplay = isCloze ? stripCloze(card.term) : card.definition;
                const hasDefinition = definitionDisplay.trim().length > 0;

                return (
                  <div key={card.id} className="relative group mb-0">
                    <div className="absolute -left-[28px] top-[22px] size-4 rounded-full border border-border/60 bg-background flex items-center justify-center">
                      <div className="size-1.5 rounded-full bg-muted-foreground/40" />
                    </div>
                    <div className="py-4 border-b border-border/30 last:border-0">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <h3 className="text-sm font-medium text-foreground tracking-wide">{termDisplay}</h3>
                        <CardActions card={card} />
                      </div>
                      {hasDefinition && (
                        <div className="text-sm text-muted-foreground leading-relaxed">{definitionDisplay}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ImportCardsDialog open={showImportDialog} onOpenChange={setShowImportDialog} onImport={onImportCards || (() => { })} />

      {editingCard && (
        <CardModal
          deck={deck}
          initialCard={editingCard}
          onSave={(updated) => {
            onUpdateCard(editingCard.id, updated);
            setEditingCard(null);
          }}
          onCancel={() => setEditingCard(null)}
        />
      )}
    </TooltipProvider>
  );
}
