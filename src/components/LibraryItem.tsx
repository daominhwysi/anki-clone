import { useState, useEffect, useRef } from "react";
import { Folder, FileText, Trash2, Copy, Download, Edit2, MoreHorizontal } from "lucide-react";
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

interface LibraryItemProps {
  deck: Deck;
  isFolder: boolean;
  itemCount: number;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (n: string) => boolean;
  onCopy: () => void;
  onDownload: () => void;
  autoRename?: boolean;
  onRenameCancel?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function LibraryItem({
  deck,
  isFolder,
  itemCount,
  onOpen,
  onDelete,
  onRename,
  onCopy,
  onDownload,
  autoRename,
  onRenameCancel,
  isSelected,
  onSelect,
}: LibraryItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(deck.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isRenaming) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isRenaming]);

  useEffect(() => {
    if (autoRename && !isRenaming) {
      setIsRenaming(true);
      setNewName(deck.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRename, deck.title]);

  const commitRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newName.trim();
    if (trimmed && trimmed !== deck.title) {
      const ok = onRename(trimmed);
      if (!ok) setNewName(deck.title);
    }
    setIsRenaming(false);
    onRenameCancel?.();
  };

  const cancelRename = () => {
    setNewName(deck.title);
    setIsRenaming(false);
    onRenameCancel?.();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) onOpen();
    else onSelect?.();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isMobile) {
      e.stopPropagation();
      onOpen();
    }
  };

  const menuItems = (
    <>
      <ContextMenuItem onSelect={() => { setIsRenaming(true); }}>
        <Edit2 className="size-3.5 mr-2" /> Rename
      </ContextMenuItem>
      <ContextMenuItem onSelect={onCopy}>
        <Copy className="size-3.5 mr-2" /> Make a copy
      </ContextMenuItem>
      <ContextMenuItem onSelect={onDownload}>
        <Download className="size-3.5 mr-2" /> Download JSON
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        onSelect={onDelete}
      >
        <Trash2 className="size-3.5 mr-2" /> Delete
      </ContextMenuItem>
    </>
  );

  const formattedDate = deck.updatedAt
    ? new Date(deck.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li
          role="row"
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          className={cn(
            "group relative flex items-center gap-3 px-4 py-[7px] cursor-pointer select-none transition-colors",
            "md:grid md:grid-cols-[1fr_80px_140px_40px]",
            isSelected && !isMobile
              ? "bg-primary/10 ring-inset ring-1 ring-primary/20"
              : "hover:bg-muted/60"
          )}
        >
          {/* Icon + Name */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isFolder ? (
              <Folder className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <FileText className="size-4 shrink-0 text-muted-foreground" />
            )}

            {isRenaming ? (
              <form
                onSubmit={commitRename}
                className="flex-1"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Input
                  ref={inputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={commitRename}
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") cancelRename();
                  }}
                  className="h-6 text-sm py-0 px-1.5"
                />
              </form>
            ) : (
              <span className="text-sm font-medium truncate leading-tight">
                {deck.title}
              </span>
            )}
          </div>

          {/* Count */}
          <div className="hidden md:flex justify-end items-center">
            <span className="text-xs tabular-nums text-muted-foreground/70">
              {itemCount} {isFolder ? "items" : "cards"}
            </span>
          </div>

          {/* Date */}
          <div className="hidden md:flex items-center pl-4">
            <span className="text-xs text-muted-foreground/70">{formattedDate}</span>
          </div>

          {/* Actions */}
          <div
            className="flex items-center justify-end md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                  <Edit2 className="size-3.5 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCopy}>
                  <Copy className="size-3.5 mr-2" /> Make a copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownload}>
                  <Download className="size-3.5 mr-2" /> Download JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="size-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </li>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        {menuItems}
      </ContextMenuContent>
    </ContextMenu>
  );
}
