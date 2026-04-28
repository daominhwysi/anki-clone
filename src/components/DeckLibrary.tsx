import { useState, useMemo, useEffect, useRef } from "react";
import { FolderPlus, Plus, Search, FileText, ArrowLeft, X, ChevronRight, Upload } from "lucide-react";
import type { Deck } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- Import các components đã tách ---
import { EmptyState } from "./EmptyState";
import { LibraryItem } from "./LibraryItem";

interface DeckLibraryProps {
  decks: Deck[];
  onSelectDeck: (id: string) => void;
  onCreateDeck: (parentId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  currentFolderId: string | null;
  onNavigate: (id: string | null) => void;
  onDeleteDeck: (id: string) => void;
  onRenameDeck: (id: string, newTitle: string) => boolean;
  onCopyDeck: (id: string) => void;
  onDownloadDeck: (id: string) => void;
  newlyCreatedId: string | null;
  onClearNewlyCreatedId: () => void;
  onImportRawJson: () => void;
}

export function DeckLibrary({
  decks,
  onSelectDeck,
  onCreateDeck,
  onCreateFolder,
  currentFolderId,
  onNavigate,
  onDeleteDeck,
  onRenameDeck,
  onCopyDeck,
  onDownloadDeck,
  newlyCreatedId,
  onClearNewlyCreatedId,
  onImportRawJson,
}: DeckLibraryProps) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentFolder = useMemo(
    () => (currentFolderId ? decks.find((d) => d.id === currentFolderId) : null),
    [decks, currentFolderId]
  );

  const breadcrumbs = useMemo(() => {
    const list: Deck[] = [];
    let cur = currentFolder;
    while (cur) {
      list.unshift(cur);
      cur = cur.parentId ? decks.find((d) => d.id === cur!.parentId) : null;
    }
    return list;
  }, [decks, currentFolder]);

  const items = useMemo(() => {
    let filtered = decks.filter((d) => {
      if (currentFolderId === null) {
        return !d.parentId || !decks.some((parent) => parent.id === d.parentId);
      }
      return d.parentId === currentFolderId;
    });
    if (search) {
      filtered = decks.filter((d) =>
        d.title.toLowerCase().includes(search.toLowerCase())
      );
    }
    return filtered;
  }, [decks, currentFolderId, search]);

  const folders = items.filter((d) => Boolean(d.isFolder));
  const flashcardDecks = items.filter((d) => !d.isFolder);

  const handleBack = () => {
    if (currentFolder?.parentId) {
      onNavigate(currentFolder.parentId);
    } else {
      onNavigate(null);
    }
  };

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <TooltipProvider>
      <div
        className="flex flex-col h-full bg-background text-foreground overflow-hidden"
        onClick={() => setSelectedId(null)}
      >
        <header className="shrink-0 flex items-center gap-2 px-4 h-12 border-b border-border shadow-sm/5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4 mx-1" />

            {currentFolderId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={handleBack}>
                    <ArrowLeft className="size-4" />
                    <span className="sr-only">Back</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Go back</TooltipContent>
              </Tooltip>
            )}

            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar select-none"
            >
              <button
                onClick={() => onNavigate(null)}
                className={cn(
                  "text-sm shrink-0 transition-colors",
                  currentFolderId
                    ? "text-muted-foreground hover:text-foreground"
                    : "font-semibold text-foreground"
                )}
              >
                Library
              </button>

              {breadcrumbs.map((crumb, idx) => (
                <span key={crumb.id} className="flex items-center gap-1 shrink-0">
                  <ChevronRight className="size-3.5 text-muted-foreground/50" />
                  {idx === breadcrumbs.length - 1 ? (
                    <span className="text-sm font-semibold text-foreground truncate max-w-[160px]">
                      {crumb.title}
                    </span>
                  ) : (
                    <button
                      onClick={() => onNavigate(crumb.id)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]"
                    >
                      {crumb.title}
                    </button>
                  )}
                </span>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {searchOpen ? (
              <div className="flex items-center gap-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="h-8 w-48 pl-8 pr-8 text-sm"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setSearchOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setSearchOpen(true)}
                  >
                    <Search className="size-4" />
                    <span className="sr-only">Search</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Search (⌘F)</TooltipContent>
              </Tooltip>
            )}

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <Plus className="size-4" />
                      <span className="sr-only">New…</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">New…</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onCreateFolder(currentFolderId)}>
                  <FolderPlus className="size-3.5 mr-2 text-muted-foreground" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateDeck(currentFolderId)}>
                  <FileText className="size-3.5 mr-2 text-muted-foreground" />
                  New Deck
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onImportRawJson}>
                  <Upload className="size-3.5 mr-2 text-muted-foreground" />
                  Import Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="hidden md:grid md:grid-cols-[1fr_80px_140px_40px] items-center px-4 h-7 border-b border-border/50 shrink-0">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">Name</span>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 text-right">Count</span>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 pl-4">Modified</span>
          <span />
        </div>

        <main
          className="flex-1 overflow-y-auto"
          onClick={() => setSelectedId(null)}
        >
          {items.length === 0 ? (
            <EmptyState
              isSearching={!!search}
              onCreateDeck={() => onCreateDeck(currentFolderId)}
              onCreateFolder={() => onCreateFolder(currentFolderId)}
            />
          ) : (
            <ul role="list" className="py-1">
              {folders.length > 0 && (
                <>
                  {folders.map((deck) => (
                    <LibraryItem
                      key={deck.id}
                      deck={deck}
                      isFolder
                      itemCount={decks.filter((d) => d.parentId === deck.id).length}
                      onOpen={() => onNavigate(deck.id)}
                      onDelete={() => onDeleteDeck(deck.id)}
                      onRename={(n) => onRenameDeck(deck.id, n)}
                      onCopy={() => onCopyDeck(deck.id)}
                      onDownload={() => onDownloadDeck(deck.id)}
                      autoRename={newlyCreatedId === deck.id}
                      onRenameCancel={onClearNewlyCreatedId}
                      isSelected={selectedId === deck.id}
                      onSelect={() => setSelectedId(deck.id)}
                    />
                  ))}
                </>
              )}

              {folders.length > 0 && flashcardDecks.length > 0 && (
                <li role="separator" className="mx-4 my-1 border-t border-border/40" />
              )}

              {flashcardDecks.map((deck) => (
                <LibraryItem
                  key={deck.id}
                  deck={deck}
                  isFolder={false}
                  itemCount={deck.cards.length}
                  onOpen={() => onSelectDeck(deck.id)}
                  onDelete={() => onDeleteDeck(deck.id)}
                  onRename={(n) => onRenameDeck(deck.id, n)}
                  onCopy={() => onCopyDeck(deck.id)}
                  onDownload={() => onDownloadDeck(deck.id)}
                  autoRename={newlyCreatedId === deck.id}
                  onRenameCancel={onClearNewlyCreatedId}
                  isSelected={selectedId === deck.id}
                  onSelect={() => setSelectedId(deck.id)}
                />
              ))}
            </ul>
          )}
        </main>

        <footer className="shrink-0 flex items-center justify-between px-4 h-7 border-t border-border/50 select-none">
          <span className="text-[11px] text-muted-foreground/60">
            {search
              ? `${items.length} result${items.length !== 1 ? "s" : ""}`
              : `${folders.length} folder${folders.length !== 1 ? "s" : ""}, ${flashcardDecks.length} deck${flashcardDecks.length !== 1 ? "s" : ""}`}
          </span>
          {selectedId && (
            <span className="text-[11px] text-muted-foreground/60">
              1 item selected
            </span>
          )}
        </footer>
      </div>
    </TooltipProvider>
  );
}
