import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ArrowLeft, ArrowRight, MoreHorizontal, RotateCcw, Shuffle, ChevronDown, Check, X } from "lucide-react";
import type { Deck, Flashcard } from "../types";
import { logReviewSession } from "../lib/storage";
import { parseCloze } from "../lib/cloze";

function ClozeContent({ card, revealedCount }: { card: Flashcard; revealedCount: number }) {
  const tokens = useMemo(() => parseCloze(card.term), [card.term]);
  const totalHidden = tokens.filter(t => t.hidden).length;
  const shownItems = new Set<number>();

  const maxRevealIndex = revealedCount;
  tokens.forEach((t, i) => {
    if (t.hidden && t.index !== undefined && t.index <= maxRevealIndex) {
      shownItems.add(i);
    }
  });

  return (
    <div className="text-lg sm:text-xl text-foreground leading-relaxed">
      {tokens.map((token, i) =>
        token.hidden ? (
          shownItems.has(i) ? (
            <span key={i} className="inline-block bg-primary/20 text-primary font-semibold px-1.5 py-0.5 rounded border border-primary/30 mx-0.5">
              {token.text}
            </span>
          ) : (
            <span key={i} className="inline-block relative bg-muted border border-dashed border-muted-foreground/30 rounded px-2 py-0.5 mx-0.5 min-w-[3rem]">
              <span className={token.hint ? "text-muted-foreground/70 italic text-xs" : "invisible"}>
                {token.hint || token.text || "\u00A0\u00A0\u00A0"}
              </span>
              {token.index !== undefined && (
                <span className="absolute -top-2 -right-1 text-[9px] text-muted-foreground/60 font-mono">{token.index}</span>
              )}
            </span>
          )
        ) : (
          <span key={i}>{token.text}</span>
        )
      )}
      {revealedCount >= totalHidden && card.definition && (
        <div className="mt-4 pt-4 border-t border-border/40 text-sm text-muted-foreground">
          {card.definition}
        </div>
      )}
    </div>
  );
}

interface StudyAreaProps {
  deck: Deck;
  onBack: () => void;
  onEdit: () => void;
  onRateCard?: (cardId: string, rating: 'easy' | 'medium' | 'hard') => void;
  mode?: 'review' | 'cram';
}

export function StudyArea({ deck, onBack, onEdit, onRateCard, mode = 'review' }: StudyAreaProps) {
  const [cards, setCards] = useState<Flashcard[]>(deck.cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [easyCount, setEasyCount] = useState(0);
  const [mediumCount, setMediumCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [sessionLogged, setSessionLogged] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<number, 'easy' | 'medium' | 'hard'>>({});
  const [revealedClozeCount, setRevealedClozeCount] = useState(0);
  const sessionStart = useRef(Date.now());

  // Reset when deck changes
  useEffect(() => {
    let studyCards = [...deck.cards];
    if (mode === 'cram') {
      studyCards.sort(() => Math.random() - 0.5);
    }
    setCards(studyCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setEasyCount(0);
    setMediumCount(0);
    setHardCount(0);
    setFinished(false);
    setSessionLogged(false);
    setRatings({});
    setRevealedClozeCount(0);
    sessionStart.current = Date.now();
  }, [deck.id]);

  const statsRef = useRef({ easy: 0, medium: 0, hard: 0, logged: false });

  // Keep ref in sync
  useEffect(() => {
    statsRef.current = { easy: easyCount, medium: mediumCount, hard: hardCount, logged: sessionLogged };
  }, [easyCount, mediumCount, hardCount, sessionLogged]);

  // Log session when finished or on unmount
  useEffect(() => {
    if (finished && !sessionLogged) {
      const total = easyCount + mediumCount + hardCount;
      if (total > 0) {
        const elapsed = Math.round((Date.now() - sessionStart.current) / 60000);
        logReviewSession(Math.max(1, elapsed)).catch(console.error);
        setSessionLogged(true);
        statsRef.current.logged = true;
      }
    }

    return () => {
      // Cleanup: log session on unmount if it hasn't been logged yet
      const { easy, medium, hard, logged } = statsRef.current;
      if (!logged && (easy + medium + hard) > 0) {
        const elapsed = Math.round((Date.now() - sessionStart.current) / 60000);
        logReviewSession(Math.max(1, elapsed)).catch(console.error);
        statsRef.current.logged = true;
      }
    };
  }, [finished]);

  const handleBackWithLog = useCallback(() => {
    if (!sessionLogged) {
      const total = easyCount + mediumCount + hardCount;
      if (total > 0) {
        const elapsed = Math.round((Date.now() - sessionStart.current) / 60000);
        logReviewSession(Math.max(1, elapsed)).catch(console.error);
        setSessionLogged(true);
        statsRef.current.logged = true;
      }
    }
    onBack();
  }, [onBack, sessionLogged, easyCount, mediumCount, hardCount]);



  const nextCard = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= cards.length) {
      setFinished(true);
    } else {
      setIsFlipped(false);
      setRevealedClozeCount(0);
      setTimeout(() => setCurrentIndex(next), 50);
    }
  }, [currentIndex, cards.length]);

  const prevCard = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setRevealedClozeCount(0);
      setTimeout(() => setCurrentIndex(currentIndex - 1), 50);
    }
  }, [currentIndex]);

  const rateCard = useCallback((type: 'easy' | 'medium' | 'hard') => {
    const prevRating = ratings[currentIndex];
    if (prevRating === type) return nextCard();

    // Update counts
    if (prevRating === 'easy') setEasyCount(prev => Math.max(0, prev - 1));
    if (prevRating === 'medium') setMediumCount(prev => Math.max(0, prev - 1));
    if (prevRating === 'hard') setHardCount(prev => Math.max(0, prev - 1));

    if (type === 'easy') setEasyCount(prev => prev + 1);
    if (type === 'medium') setMediumCount(prev => prev + 1);
    if (type === 'hard') setHardCount(prev => prev + 1);

    setRatings(prev => ({ ...prev, [currentIndex]: type }));
    if (onRateCard && mode !== 'cram') {
      onRateCard(cards[currentIndex].id, type);
    }

    if (type === 'hard') {
      // Re-queue the card so it appears again in this session
      const currentCard = cards[currentIndex];
      setCards(prev => [...prev, { ...currentCard }]);
    }

    nextCard();
  }, [currentIndex, ratings, nextCard, cards, onRateCard]);

  const handleEasy = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    rateCard('easy');
  }, [rateCard]);

  const handleMedium = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    rateCard('medium');
  }, [rateCard]);

  const handleHard = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    rateCard('hard');
  }, [rateCard]);

  const handleReset = () => {
    let studyCards = [...deck.cards];
    if (mode === 'cram') {
      studyCards.sort(() => Math.random() - 0.5);
    }
    setCards(studyCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setEasyCount(0);
    setMediumCount(0);
    setHardCount(0);
    setFinished(false);
    setSessionLogged(true);
    setRatings({});
    setRevealedClozeCount(0);
    setTimeout(() => setSessionLogged(false), 100);
  };

  const toggleShuffle = useCallback(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setRatings({});
    setRevealedClozeCount(0);
    setEasyCount(0);
    setMediumCount(0);
    setHardCount(0);
  }, [cards]);

  const clozeTokenCount = useMemo(() => {
    const card = cards[currentIndex];
    if (card?.cardType !== 'cloze') return 0;
    return parseCloze(card.term).filter(t => t.hidden).length;
  }, [cards, currentIndex]);

  const handleCardClick = useCallback(() => {
    const card = cards[currentIndex];
    if (card?.cardType === 'cloze') {
      if (revealedClozeCount < clozeTokenCount) {
        setRevealedClozeCount(prev => prev + 1);
      } else {
        setRevealedClozeCount(0);
      }
    } else {
      setIsFlipped(f => !f);
    }
  }, [cards, currentIndex, revealedClozeCount, clozeTokenCount, nextCard]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        handleCardClick();
      } else if (e.code === "Digit1") {
        e.preventDefault();
        handleEasy();
      } else if (e.code === "Digit2") {
        e.preventDefault();
        handleMedium();
      } else if (e.code === "Digit3") {
        e.preventDefault();
        handleHard();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        nextCard();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        prevCard();
      } else if (e.code === "ArrowUp" || e.code === "ArrowDown") {
        e.preventDefault();
        handleCardClick();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCardClick, handleEasy, handleMedium, handleHard]);

  if (!deck || deck.cards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <h2 className="text-2xl font-bold text-foreground">No cards in this deck</h2>
        <button onClick={onEdit} className="px-4 py-2 bg-muted border border-border rounded hover:bg-accent transition-colors">
          Add Cards
        </button>
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
          ← Go Back
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;

  if (finished) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border text-sm">
          <button onClick={handleBackWithLog} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="font-medium">{deck.title}</span>
          <div />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6 text-center">
          <div className="text-6xl">🎉</div>
          <h2 className="text-3xl font-bold">Session Complete!</h2>
          <div className="flex gap-8 text-lg">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-green-500">{easyCount}</span>
              <span className="text-muted-foreground text-sm">Easy</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-orange-500">{mediumCount}</span>
              <span className="text-muted-foreground text-sm">Medium</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-red-500">{hardCount}</span>
              <span className="text-muted-foreground text-sm">Again</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold">{cards.length}</span>
              <span className="text-muted-foreground text-sm">Total</span>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:bg-muted-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Study Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden relative">

      {/* Top navbar */}
      <header className="flex items-center justify-between px-6 py-4 text-sm border-b border-border/50 bg-background/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={handleBackWithLog} className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4 text-muted-foreground font-medium select-none">
            <span className="hidden sm:inline hover:text-foreground cursor-pointer transition-colors" onClick={handleBackWithLog}>Flashcards</span>
            <span className="hidden sm:inline opacity-40">/</span>
            <span className="text-foreground">{deck.title}</span>
            {mode === 'cram' && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Cram mode
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-4 border-r border-border/50 pr-6 mr-2">
            <button
              onClick={toggleShuffle}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
            >
              <Shuffle className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span className="text-xs font-semibold">Shuffle</span>
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
            >
              <RotateCcw className="w-4 h-4 group-hover:-rotate-45 transition-transform" />
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold tracking-tight select-none">
            <span className="text-red-500/90">{hardCount}</span>
            <span className="text-muted-foreground/30 font-normal">/</span>
            <span className="text-foreground text-sm font-black">{currentIndex + 1}</span>
            <span className="text-muted-foreground/30 font-normal">/</span>
            <span className="text-muted-foreground">{cards.length}</span>
          </div>
        </div>
      </header>

      {/* Main Flashcard Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-4xl mx-auto">
        <div
          className="w-full max-w-2xl min-h-[220px] sm:min-h-[300px] bg-card hover:bg-muted/50 transition-colors rounded-xl flex flex-col relative cursor-pointer shadow-md select-none border border-border touch-pan-y"
          onClick={handleCardClick}
          onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStart === null) return;
            const touchEnd = e.changedTouches[0].clientX;
            const diff = touchStart - touchEnd;
            if (Math.abs(diff) > 50) {
              if (diff > 0) nextCard();
              else prevCard();
            }
            setTouchStart(null);
          }}
        >
          {/* Card meta */}
          <div className="absolute top-4 right-4 flex items-center gap-2 text-muted-foreground text-xs font-mono">
            <button
              onClick={(e) => { e.stopPropagation(); }}
              className="hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Card Content */}
          <div className="flex-1 flex items-center justify-center p-8 sm:p-12 overflow-hidden text-center">
            {currentCard.cardType === 'cloze' ? (
              <ClozeContent card={currentCard} revealedCount={revealedClozeCount} />
            ) : !isFlipped ? (
              <span className="text-xl sm:text-2xl text-foreground leading-relaxed">
                {currentCard.term}
              </span>
            ) : (
              <div className="flex flex-col gap-4 text-center">
                {currentCard.definition ? (
                  <span className="text-xs sm:text-sm text-muted-foreground border-b border-border pb-2 mb-2 inline-block">
                    {currentCard.term}
                  </span>
                ) : null}
                <span className="text-lg sm:text-xl text-foreground leading-relaxed">
                  {currentCard.definition || currentCard.term}
                </span>
              </div>
            )}
          </div>

          {/* Flip hint */}
          <div className="w-full border-t border-border/10 bg-muted/5 mt-auto">
            <div className="w-full text-center py-5 text-sm text-muted-foreground/70 font-medium tracking-wide flex items-center justify-center gap-3">
              <ChevronDown className="w-4 h-4 opacity-50" />
              {currentCard.cardType === 'cloze' ? (
                <span>
                  {revealedClozeCount < clozeTokenCount
                    ? `Tap to reveal (${revealedClozeCount}/${clozeTokenCount})`
                    : "Tap to hide answer"}
                </span>
              ) : (
                <span>{isFlipped ? "Tap to hide answer" : "Tap to reveal"}</span>
              )}
              <div className="hidden sm:flex items-center justify-center px-1.5 py-0.5 rounded-md bg-muted border border-border/50 text-[10px] font-black tracking-widest text-muted-foreground shadow-sm ml-1 uppercase">
                Space
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section - Unified for PC and Mobile using responsive classes */}
      <footer className="w-full px-6 py-6 bg-background/80 backdrop-blur-2xl border-t border-border/10">
        <div className="max-w-4xl mx-auto flex flex-col gap-6 sm:gap-8">

          {/* PC Layout: Row of controls */}
          <div className="hidden sm:flex items-center justify-between gap-4">
            <button
              onClick={prevCard}
              disabled={currentIndex === 0}
              className="w-12 h-12 rounded-xl flex items-center justify-center bg-card/5 border border-border/40 disabled:opacity-20 text-muted-foreground hover:text-foreground transition-all hover:bg-muted/10 active:scale-90"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-4 flex-1 justify-center max-w-xl">
              {mode === 'cram' ? (
                <>
                  <button
                    onClick={handleHard}
                    className="flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-full bg-card border border-border/40 hover:bg-muted/10 transition-all hover:scale-[1.02] active:scale-95 group font-bold text-sm"
                  >
                    <X className="w-4 h-4 text-red-500" />
                    <span>Forgot</span>
                  </button>

                  <button
                    onClick={handleEasy}
                    className="flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-full bg-card border border-border/40 hover:bg-muted/10 transition-all hover:scale-[1.02] active:scale-95 group font-bold text-sm"
                  >
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Remembered</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEasy}
                    className="flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-card border border-border/40 hover:bg-muted/10 transition-all hover:scale-[1.02] active:scale-95 group font-bold text-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
                    Easy
                  </button>

                  <button
                    onClick={handleMedium}
                    className="flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-card border border-border/40 hover:bg-muted/10 transition-all hover:scale-[1.02] active:scale-95 group font-bold text-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
                    Medium
                  </button>

                  <button
                    onClick={handleHard}
                    className="flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-card border border-border/40 hover:bg-muted/10 transition-all hover:scale-[1.02] active:scale-95 group font-bold text-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
                    Again
                  </button>
                </>
              )}
            </div>

            <button
              onClick={nextCard}
              className="w-12 h-12 rounded-xl flex items-center justify-center bg-card/5 border border-border/40 text-muted-foreground hover:text-foreground transition-all hover:bg-muted/10 active:scale-90"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Layout: Stacked Grid + Nav */}
          <div className="sm:hidden flex flex-col gap-6">
            <div className="w-full h-1 bg-muted/30 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-foreground/40 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className={`grid ${mode === 'cram' ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
              {mode === 'cram' ? (
                <>
                  <button
                    onClick={handleHard}
                    className="flex flex-col items-center justify-center py-4 rounded-full bg-card/40 border border-border/40 hover:bg-muted/30 transition-all"
                  >
                    <X className="w-5 h-5 text-red-500 mb-1" />
                    <span className="text-sm font-bold text-foreground sm:inline hidden">Forgot</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 opacity-60 sm:inline hidden">Again</span>
                  </button>

                  <button
                    onClick={handleEasy}
                    className="flex flex-col items-center justify-center py-4 rounded-full bg-card/40 border border-border/40 hover:bg-muted/30 transition-all"
                  >
                    <Check className="w-5 h-5 text-green-500 mb-1" />
                    <span className="text-sm font-bold text-foreground sm:inline hidden">Remembered</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 opacity-60 sm:inline hidden">Knew it</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEasy}
                    className="flex flex-col items-center justify-center py-4 rounded-2xl bg-card/40 border border-border/40 hover:bg-muted/30 transition-all"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 mb-2 shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
                    <span className="text-sm font-bold text-foreground">Easy</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 opacity-60">Knew it</span>
                  </button>

                  <button
                    onClick={handleMedium}
                    className="flex flex-col items-center justify-center py-4 rounded-2xl bg-card/40 border border-border/40 hover:bg-muted/30 transition-all"
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-500 mb-2 shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                    <span className="text-sm font-bold text-foreground">Medium</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 opacity-60">Almost</span>
                  </button>

                  <button
                    onClick={handleHard}
                    className="flex-col flex items-center justify-center py-4 rounded-2xl bg-card/40 border border-border/40 hover:bg-muted/30 transition-all"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 mb-2 shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                    <span className="text-sm font-bold text-foreground">Again</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 opacity-60">Forgot</span>
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={prevCard}
                disabled={currentIndex === 0}
                className="w-12 h-12 rounded-2xl flex items-center justify-center bg-card/40 border border-border/40 disabled:opacity-20 text-muted-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-muted-foreground/60 tracking-wider">
                  {currentIndex + 1} of {cards.length}
                </span>
              </div>

              <button
                onClick={nextCard}
                className="w-12 h-12 rounded-2xl flex items-center justify-center bg-card/40 border border-border/40 text-muted-foreground"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
