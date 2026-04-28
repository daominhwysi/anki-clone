import { useState, useEffect, useRef, useCallback } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { Dashboard } from "./components/Dashboard";
import { StudyArea } from "./components/StudyArea";
import { Sidebar } from "./components/Sidebar";
import { DeckView } from "./components/DeckView";
import { DeckLibrary } from "./components/DeckLibrary";
import { CardModal } from "./components/CardModal";
import { TrashView } from "./components/TrashView";
import { ImportDeckDialog } from "./components/ImportDeckDialog";
import type { Deck, Flashcard } from "./types";
import { getDecks, saveDecks } from "./lib/storage";
import { extractInboxCards, calculateSRS, isCardDue } from "./lib/srs";
import { hasClozeMarkers } from "./lib/cloze";
import { SettingsModal } from "./components/SettingsModal";
import { toast } from "@/hooks/use-toast";

const initialDecks: Deck[] = [
];

type ViewState = "dashboard" | "library" | "study" | "deck" | "trash" | "inbox";

export default function App() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [view, setView] = useState<ViewState>("dashboard");
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [libraryFolderId, setLibraryFolderId] = useState<string | null>(null);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showImportDeck, setShowImportDeck] = useState(false);
  const [studyMode, setStudyMode] = useState<"review" | "cram">("review");
  useEffect(() => {
    const savedFont = localStorage.getItem("app-font");
    if (savedFont) {
      document.documentElement.style.setProperty('--app-font', savedFont);
    }
  }, []);
  // Sidebar width management
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(256);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(600, Math.max(200, startWidth.current + delta));
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    getDecks().then((loadedDecks) => {
      if (loadedDecks.length === 0) {
        setDecks(initialDecks);
        saveDecks(initialDecks);
      } else {
        setDecks(loadedDecks);
      }
    });
  }, []);

  // Keyboard shortcut: N = open add card modal (when in deck view)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === "n" || e.key === "N") && !showAddCard) {
        if (view === "deck" && activeDeckId) {
          setShowAddCard(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, activeDeckId, showAddCard]);

  const updateDecks = (newDecks: Deck[]) => {
    setDecks(newDecks);
    saveDecks(newDecks);
  };

  const handleUpdateCard = (deckId: string, cardId: string, updatedCard: Flashcard) => {
    const newDecks = decks.map(d => {
      if (d.id === deckId) {
        return {
          ...d,
          cards: d.cards.map(c => c.id === cardId ? updatedCard : c),
          updatedAt: new Date().toISOString()
        };
      }
      return d;
    });
    updateDecks(newDecks);
  };

  const handleRateCardGlobal = (cardId: string, rating: 'easy' | 'medium' | 'hard') => {
    const newDecks = decks.map(d => {
      const cardIndex = d.cards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        const newCards = [...d.cards];
        newCards[cardIndex] = calculateSRS(newCards[cardIndex], rating);
        return { ...d, cards: newCards, updatedAt: new Date().toISOString() };
      }
      return d;
    });
    updateDecks(newDecks);
  };

  const handleNavigateToLibrary = (folderId: string | null) => {
    setLibraryFolderId(folderId);
    setView("library");
    setActiveDeckId(null);
  };
  const handleDeleteCardFromDeck = (deckId: string, cardId: string) => {
    const newDecks = decks.map(d => {
      if (d.id === deckId) {
        return {
          ...d,
          cards: d.cards.filter(c => c.id !== cardId),
          updatedAt: new Date().toISOString()
        };
      }
      return d;
    });
    updateDecks(newDecks);
  };
  const handleDeleteDeck = (id: string) => {
    const idsToTrash: string[] = [id];

    // Find all descendants recursively
    const findDescendants = (parentId: string) => {
      decks.forEach(d => {
        if (d.parentId === parentId) {
          idsToTrash.push(d.id);
          findDescendants(d.id);
        }
      });
    };
    findDescendants(id);

    const newDecks = decks.map(d =>
      idsToTrash.includes(d.id) ? { ...d, isTrashed: true } : d
    );

    updateDecks(newDecks);
    if (activeDeckId === id || idsToTrash.includes(activeDeckId || "")) {
      setView("library");
      setActiveDeckId(null);
    }
    toast({
      title: "Moved to trash",
      description: `"${decks.find(d => d.id === id)?.title || "Item"}" moved to trash.`,
    });
  };
  // Inside App.tsx

  /** Helper to get all child IDs of a folder recursively */
  const getAllDescendantIds = (parentId: string, allDecks: Deck[]): string[] => {
    const children = allDecks.filter((d) => d.parentId === parentId);
    let ids: string[] = [];
    children.forEach((child) => {
      ids.push(child.id);
      ids.push(...getAllDescendantIds(child.id, allDecks));
    });
    return ids;
  };

  /** Restore a deck AND all its children from trash */
  const handleRestoreDeck = (id: string) => {
    const idsToRestore = [id, ...getAllDescendantIds(id, decks)];
    const newDecks = decks.map((d) =>
      idsToRestore.includes(d.id) ? { ...d, isTrashed: false } : d
    );
    updateDecks(newDecks);
    toast({
      title: "Restored",
      description: `"${decks.find(d => d.id === id)?.title || "Item"}" restored.`,
    });
  };

  /** Permanently delete a deck AND all its children */
  const handlePermanentDelete = (id: string) => {
    const idsToRemove = [id, ...getAllDescendantIds(id, decks)];
    const newDecks = decks.filter((d) => !idsToRemove.includes(d.id));
    updateDecks(newDecks);
    toast({
      title: "Permanently deleted",
      description: `${idsToRemove.length} item${idsToRemove.length > 1 ? "s" : ""} deleted permanently.`,
      variant: "destructive",
    });
  };

  /** Save a single new card into the active deck */
  const handleSaveNewCard = (card: Flashcard) => {
    if (!activeDeckId) return;
    const newDecks = decks.map(d =>
      d.id === activeDeckId ? { ...d, cards: [...d.cards, card], updatedAt: new Date().toISOString() } : d
    );
    updateDecks(newDecks);
    // Modal stays open so user can add another card
  };

  /** Import multiple cards into the active deck */
  const handleImportCards = (importedCards: { term: string; definition: string }[]) => {
    if (!activeDeckId) return;

    const newFlashcards: Flashcard[] = importedCards.map(c => ({
      id: `card-${crypto.randomUUID()}`,
      term: c.term,
      definition: c.definition,
      cardType: hasClozeMarkers(c.term) ? 'cloze' : undefined,
    }));

    const newDecks = decks.map(d =>
      d.id === activeDeckId ? { ...d, cards: [...d.cards, ...newFlashcards], updatedAt: new Date().toISOString() } : d
    );
    updateDecks(newDecks);
    toast({
      title: "Import successful",
      description: `${importedCards.length} card${importedCards.length > 1 ? "s" : ""} imported.`,
    });
  };

  /** Create a new subdeck or folder under the given parent */
  const handleCreateItem = (parentId: string | null, isFolder: boolean, initialTitle?: string) => {
    const baseTitle = initialTitle || (isFolder ? "New Folder" : "New Deck");
    let targetTitle = baseTitle;
    let counter = 1;

    // Ensure unique name at the same level
    while (decks.some(d => d.parentId === parentId && d.title === targetTitle && !d.isTrashed)) {
      counter++;
      targetTitle = `${baseTitle} (${counter})`;
    }

    const newId = `deck-${crypto.randomUUID()}`;
    const newItem: Deck = {
      id: newId,
      title: targetTitle,
      cards: [],
      parentId,
      isFolder,
    };
    updateDecks([...decks, newItem]);
    setNewlyCreatedId(newId);
    toast({
      title: `${isFolder ? "Folder" : "Deck"} created`,
      description: `"${targetTitle}" created.`,
    });
  };

  /** Rename deck or folder */
  const handleRenameDeck = (id: string, newTitle: string): boolean => {
    const target = decks.find(d => d.id === id);
    if (!target) return false;

    // Check for duplicate names among siblings
    const isDuplicate = decks.some(d =>
      d.id !== id &&
      d.parentId === target.parentId &&
      d.title.toLowerCase() === newTitle.trim().toLowerCase() &&
      !d.isTrashed
    );

    if (isDuplicate) {
      toast({
        title: "Duplicate name",
        description: `"${newTitle.trim()}" already exists at this level.`,
        variant: "destructive",
      });
      return false;
    }

    const newDecks = decks.map(d => d.id === id ? { ...d, title: newTitle.trim() } : d);
    updateDecks(newDecks);
    toast({
      title: "Renamed",
      description: `Renamed to "${newTitle.trim()}".`,
    });
    return true;
  };

  /** Download deck contents as JSON */
  const handleDownloadDeck = (id: string) => {
    const target = decks.find(d => d.id === id);
    if (!target) return;
    const dataStr = JSON.stringify(target, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${target.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Copy a deck or recursively copy a folder */
  const handleCopyDeck = (id: string) => {
    const target = decks.find(d => d.id === id);
    if (!target) return;

    const newId = `deck-${crypto.randomUUID()}`;
    const newDeck: Deck = {
      ...target,
      id: newId,
      title: `${target.title} (Copy)`,
    };

    const allNewItems = [newDeck];

    const copyRecursive = (sourceId: string, destParentId: string | null) => {
      const children = decks.filter(d => d.parentId === sourceId);
      children.forEach(c => {
        const cid = `deck-${crypto.randomUUID()}`;
        allNewItems.push({ ...c, id: cid, parentId: destParentId });
        copyRecursive(c.id, cid);
      });
    };
    copyRecursive(target.id, newId);

    updateDecks([...decks, ...allNewItems]);
    setNewlyCreatedId(newId);
  };

  /** Import a deck from JSON data */
  const handleImportJsonDeck = (data: { title: string; cards: { term: string; definition: string }[] }) => {
    const newId = `deck-${crypto.randomUUID()}`;
    const newFlashcards: Flashcard[] = data.cards.map(c => ({
      id: `card-${crypto.randomUUID()}`,
      term: c.term,
      definition: c.definition,
      cardType: hasClozeMarkers(c.term) ? 'cloze' : undefined,
    }));

    const newDeck: Deck = {
      id: newId,
      title: data.title,
      cards: newFlashcards,
      parentId: null,
      isFolder: false,
    };

    updateDecks([...decks, newDeck]);
    setNewlyCreatedId(newId);
    toast({
      title: "Deck imported",
      description: `"${data.title}" imported with ${data.cards.length} card${data.cards.length !== 1 ? "s" : ""}.`,
    });
  };

  const handleSelectDeck = (id: string) => {
    setActiveDeckId(id);
    setView("deck");
  };

  const onLibrary = () => {
    setView("library");
    setActiveDeckId(null);
    setLibraryFolderId(null);
  };

  /** Navigate back to the library */
  const handleBack = () => {
    setView("library");
    setActiveDeckId(null);
  };

  const activeDeck = activeDeckId ? decks.find(d => d.id === activeDeckId) : undefined;

  const visibleDecks = decks.filter(d => !d.isTrashed);
  const trashCount = decks.filter(d => d.isTrashed).length;
  const inboxCards = extractInboxCards(decks);

  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
    >
      <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden dark w-full">
        <Sidebar
          onSettings={() => setShowSettings(true)}

          onDashboard={() => { setView("dashboard"); setActiveDeckId(null); }}
          onLibrary={onLibrary}
          onInbox={() => { setView("inbox"); setActiveDeckId(null); }}
          onTrash={() => { setView("trash"); setActiveDeckId(null); }}
          view={view}
          onResizeMouseDown={onMouseDown}
          trashCount={trashCount}
          inboxCount={inboxCards.length}

        />
        <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden relative">
          {view === "dashboard" && (
            <Dashboard decks={visibleDecks} />
          )}
          {view === "library" && (
            <DeckLibrary
              decks={visibleDecks}
              onSelectDeck={handleSelectDeck}
              onCreateDeck={(parentId) => handleCreateItem(parentId, false, "New Deck")}
              onCreateFolder={(parentId) => handleCreateItem(parentId, true, "New Folder")}
              onDeleteDeck={handleDeleteDeck}
              onRenameDeck={handleRenameDeck}
              onCopyDeck={handleCopyDeck}
              onDownloadDeck={handleDownloadDeck}
              currentFolderId={libraryFolderId}
              onNavigate={setLibraryFolderId}
              newlyCreatedId={newlyCreatedId}
              onClearNewlyCreatedId={() => setNewlyCreatedId(null)}
            />
          )}
          {view === "deck" && activeDeck && (
            <DeckView
              deck={activeDeck}
              allDecks={visibleDecks}
              onBack={handleBack}
              onStudy={(mode) => {
                setStudyMode(mode);
                setView("study");
              }}
              onAddCard={() => setShowAddCard(true)}
              onUpdateCard={(cardId, updatedCard) => handleUpdateCard(activeDeck.id, cardId, updatedCard)}
              onDeleteCard={(cardId) => handleDeleteCardFromDeck(activeDeck.id, cardId)}
              onImportCards={handleImportCards}
              onSelectDeck={handleSelectDeck}
              onDeleteDeck={() => handleDeleteDeck(activeDeck.id)}
              onNavigateToLibrary={handleNavigateToLibrary}
            />
          )}
          {view === "study" && activeDeck && (
            <StudyArea
              deck={{
                ...activeDeck,
                cards: studyMode === "review"
                  ? activeDeck.cards.filter(isCardDue)
                  : activeDeck.cards
              }}
              onBack={() => setView("deck")}
              onEdit={() => setView("deck")}
              onRateCard={handleRateCardGlobal}
              mode={studyMode}
            />
          )}
          {view === "inbox" && inboxCards.length > 0 && (
            <StudyArea
              deck={{
                id: "inbox-deck",
                title: "Inbox",
                cards: inboxCards,
                isFolder: false,
              }}
              onBack={() => setView("dashboard")}
              onEdit={() => setView("library")}
              onRateCard={handleRateCardGlobal}
              mode="review"
            />
          )}
          {view === "inbox" && inboxCards.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background/50 backdrop-blur-sm m-4 rounded-xl border border-border/50">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">Inbox Zero!</h2>
              <p className="text-muted-foreground mb-6">You have reviewed all due cards for today. Check back later or add new cards!</p>
              <button
                onClick={() => setView("library")}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Go to Library
              </button>
            </div>
          )}
          {view === "trash" && (
            <TrashView
              decks={decks}
              onRestore={handleRestoreDeck}
              onDelete={handlePermanentDelete}
              onBack={() => setView("library")}
            />
          )}

          {/* Add Card Modal overlay */}
          {showAddCard && activeDeck && (
            <CardModal
              deck={activeDeck}
              onSave={handleSaveNewCard}
              onCancel={() => setShowAddCard(false)}
            />
          )}
          <SettingsModal
            open={showSettings}
            onOpenChange={setShowSettings}
          />
          <ImportDeckDialog
            open={showImportDeck}
            onOpenChange={setShowImportDeck}
            onImport={handleImportJsonDeck}
          />
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
