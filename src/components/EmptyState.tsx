import { Search, Folder, FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  isSearching: boolean;
  onCreateDeck: () => void;
  onCreateFolder: () => void;
}

export function EmptyState({
  isSearching,
  onCreateDeck,
  onCreateFolder,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 gap-4 text-center px-6">
      <div className="p-5 rounded-2xl bg-muted/60">
        {isSearching ? (
          <Search className="size-10 text-muted-foreground/40" />
        ) : (
          <Folder className="size-10 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">
          {isSearching ? "No results found" : "Nothing here yet"}
        </p>
        <p className="text-xs text-muted-foreground">
          {isSearching
            ? "Try a different search term."
            : "Create a folder or deck to get started."}
        </p>
      </div>
      {!isSearching && (
        <div className="flex items-center gap-2 mt-1">
          <Button size="sm" variant="outline" onClick={onCreateFolder}>
            <FolderPlus className="size-3.5 mr-1.5" />
            New Folder
          </Button>
          <Button size="sm" onClick={onCreateDeck}>
            <Plus className="size-3.5 mr-1.5" />
            New Deck
          </Button>
        </div>
      )}
    </div>
  );
}
