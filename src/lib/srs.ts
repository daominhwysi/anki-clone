import type { Flashcard } from "../types";

export type Rating = 'easy' | 'medium' | 'hard';

export function calculateSRS(card: Flashcard, rating: Rating): Flashcard {
  let interval = card.interval || 0;
  let easeFactor = card.easeFactor || 2.5;
  let repetitions = card.repetitions || 0;

  if (rating === 'hard') {
    repetitions = 0;
    interval = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (rating === 'medium') {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else if (rating === 'easy') {
    if (repetitions === 0) {
      interval = 2; // skip to 2 days
    } else if (repetitions === 1) {
      interval = 4;
    } else {
      interval = Math.round(interval * easeFactor * 1.3);
    }
    easeFactor += 0.15;
    repetitions++;
  }

  const nextReview = new Date();
  if (interval === 0) {
    // Due right now (or in 10 minutes, but we can just say now so it comes back)
    nextReview.setMinutes(nextReview.getMinutes() + 10);
  } else {
    nextReview.setDate(nextReview.getDate() + interval);
  }

  return {
    ...card,
    interval,
    easeFactor,
    repetitions,
    lastReview: new Date().toISOString(),
    nextReview: nextReview.toISOString()
  };
}

export function isCardDue(card: Flashcard): boolean {
  if (!card.nextReview) return true; // New cards are due
  return new Date(card.nextReview) <= new Date();
}

export function extractInboxCards(decks: import("../types").Deck[]): (Flashcard & { deckId: string, deckTitle: string })[] {
  const inbox: (Flashcard & { deckId: string, deckTitle: string })[] = [];
  for (const deck of decks) {
    if (deck.isTrashed) continue;
    for (const card of deck.cards || []) {
      if (isCardDue(card)) {
        inbox.push({ ...card, deckId: deck.id, deckTitle: deck.title });
      }
    }
  }
  // Sort priority: learning/hard first, then due, then new
  return inbox.sort((a, b) => {
    const aRev = a.nextReview ? new Date(a.nextReview).getTime() : 0;
    const bRev = b.nextReview ? new Date(b.nextReview).getTime() : 0;
    if (aRev !== bRev) return aRev - bRev;
    return 0; // if same time, maintain order
  });
}
