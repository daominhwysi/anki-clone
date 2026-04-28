export type CardType = 'standard' | 'cloze';

export interface ClozeToken {
  text: string;
  hidden: boolean;
  index?: number;
  hint?: string;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  cardType?: CardType;
  // SRS fields
  nextReview?: string;   // ISO string date
  lastReview?: string;   // ISO string date
  interval?: number;      // Days
  easeFactor?: number;    // Default 2.5
  repetitions?: number;   // Count of successful reviews
}

export interface Deck {
  id: string;
  title: string;
  cards: Flashcard[];
  parentId?: string | null;
  isTrashed?: boolean;
  isFolder?: boolean;
  updatedAt?: string;

}
