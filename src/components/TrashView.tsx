import { useState, useMemo, useEffect, useRef } from "react";
import {
  Trash2,
  RotateCcw,
  Search,
  Folder,
  FileText,
  ArrowLeft,
  X,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import type { Deck } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TrashViewProps {
  decks: Deck[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export function TrashView({ decks, onRestore, onDelete, onBack }: TrashViewProps) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [trashFolderId, setTrashFolderId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null); // Added selection state
  const searchInputRef = useRef<HTMLInputElement>(null);


  // 1. Determine which items to show based on hierarchy or search
  const trashedItems = useMemo(() => {
    // If searching, show every item that is trashed, ignoring hierarchy
    if (search) {
      return decks.filter((d) =>
        d.isTrashed && d.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Otherwise, filter based on the current trash folder depth
    return decks.filter((d) => {
      if (!d.isTrashed) return false;

      if (trashFolderId === null) {
        // At the root of Trash, only show items whose parent is NOT trashed
        // This prevents English2 from appearing next to English1
        const parent = d.parentId ? decks.find((p) => p.id === d.parentId) : null;
        return !parent || !parent.isTrashed;
      }

      // If we are inside a folder in the trash, show its direct children
      return d.parentId === trashFolderId;
    });
  }, [decks, search, trashFolderId]);

  // 2. Navigation helpers (Breadcrumbs)
  const currentFolder = useMemo(
    () => (trashFolderId ? decks.find((d) => d.id === trashFolderId) : null),
    [decks, trashFolderId]
  );

  const breadcrumbs = useMemo(() => {
    const list: Deck[] = [];
    let cur = currentFolder;
    while (cur) {
      list.unshift(cur);
      // Only keep going up if the parent is also in the trash
      const parent = cur.parentId ? decks.find((d) => d.id === cur!.parentId) : null;
      cur = parent && parent.isTrashed ? parent : null;
    }
    return list;
  }, [decks, currentFolder]);

  const handleBack = () => {
    if (trashFolderId === null) {
      onBack(); // Go to Library
    } else {
      // Go up one level within the trash
      const parent = currentFolder?.parentId ? decks.find(d => d.id === currentFolder.parentId) : null;
      if (parent && parent.isTrashed) {
        setTrashFolderId(parent.id);
      } else {
        setTrashFolderId(null);
      }
    }
  };

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [searchOpen]);


  return (
    <TooltipProvider>
      <div
        className="flex flex-col h-full bg-background text-foreground overflow-hidden"
        onClick={() => setSelectedId(null)} // Deselect when clicking empty space
      >
        <header className="shrink-0 flex items-center gap-2 px-4 h-12 border-b border-border shadow-sm/5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={handleBack}>
                  <ArrowLeft className="size-4" />
                  <span className="sr-only">Back</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Go back</TooltipContent>
            </Tooltip>

            <nav className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar select-none">
              <button
                onClick={() => setTrashFolderId(null)}
                className={cn(
                  "text-sm shrink-0 transition-colors",
                  trashFolderId
                    ? "text-muted-foreground hover:text-foreground"
                    : "font-semibold text-foreground"
                )}
              >
                Trash
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
                      onClick={() => setTrashFolderId(crumb.id)}
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
                    placeholder="Search trash…"
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
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setSearchOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setSearchOpen(true)}>
                <Search className="size-4" />
              </Button>
            )}
          </div>
        </header>

        <div className="hidden md:grid md:grid-cols-[1fr_80px_140px_40px] items-center px-4 h-7 border-b border-border/50 shrink-0">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">Deleted Item</span>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 text-right">Count</span>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 pl-4">Modified</span>
          <span />
        </div>

        <main className="flex-1 overflow-y-auto">
          {trashedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-24 gap-4 text-center px-6 opacity-50">
              <Trash2 className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Trash is empty</p>
            </div>
          ) : (
            <ul role="list" className="py-1">
              {trashedItems.map((item) => (
                <TrashListItem
                  key={item.id}
                  deck={item}
                  isSelected={selectedId === item.id}
                  onSelect={() => setSelectedId(item.id)}
                  onOpen={() => item.isFolder ? setTrashFolderId(item.id) : null}
                  onRestore={() => onRestore(item.id)}
                  onDelete={() => onDelete(item.id)}
                />
              ))}
            </ul>
          )}
        </main>

        {/* Footer */}
        <footer className="shrink-0 flex items-center justify-between px-4 h-7 border-t border-border/50 select-none bg-muted/5">
          <span className="text-[11px] text-muted-foreground/60">
            {trashedItems.length} items
          </span>
          {selectedId && <span className="text-[11px] text-primary font-medium">1 item selected</span>}
        </footer>
      </div>
    </TooltipProvider>
  );
}

function TrashListItem({
  deck,
  isSelected,
  onSelect,
  onOpen,
  onRestore,
  onDelete,
}: {
  deck: Deck;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const isFolder = deck.isFolder;
  const itemCount = isFolder ? 0 : deck.cards.length;
  const formattedDate = deck.updatedAt
    ? new Date(deck.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li
          role="row"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className={cn(
            "group relative flex items-center gap-3 px-4 py-[7px] select-none transition-colors",
            "md:grid md:grid-cols-[1fr_80px_140px_40px]",
            isSelected ? "bg-primary/10 ring-inset ring-1 ring-primary/20" : "hover:bg-muted/60"
          )}
        >
          {/* Content columns same as LibraryItem... */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isFolder ? <Folder className="size-4 shrink-0 text-muted-foreground" /> : <FileText className="size-4 shrink-0 text-muted-foreground" />}
            <span className="text-sm font-medium truncate leading-tight">{deck.title}</span>
          </div>

          <div className="hidden md:flex justify-end items-center">
            <span className="text-xs tabular-nums text-muted-foreground/70">
              {isFolder ? "" : `${itemCount} cards`}
            </span>
          </div>

          <div className="hidden md:flex items-center pl-4">
            <span className="text-xs text-muted-foreground/70">{formattedDate}</span>
          </div>

          <div className="flex items-center justify-end md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={onRestore}>
                  <RotateCcw className="size-3.5 mr-2" /> Restore Item and Contents
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive font-bold" onClick={onDelete}>
                  <Trash2 className="size-3.5 mr-2" /> Delete Permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </li>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={onRestore}><RotateCcw className="size-3.5 mr-2" /> Restore</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onDelete} className="text-destructive font-bold"><Trash2 className="size-3.5 mr-2" /> Delete Permanently</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
