# AGENTS.md

## Package Manager
This project uses **bun** as the package manager. Always use `bun` for dependency management and running scripts.

## Available Skills
This project has the following agent skills installed:

- **shadcn** — Manages shadcn/ui components and projects. Use for adding, searching, fixing, debugging, styling, and composing UI components. Automatically applies project conventions defined in `components.json` (new-york style, zinc base color, lucide icons).

## Common Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run dev` | Start dev server with HMR (listens on all hosts) |
| `bun run build` | Type-check + production build |
| `bun run lint` | Run ESLint |
| `bun run preview` | Preview production build |

## Project Structure

```
src/
  App.tsx                 — Root component, state management, routing
  main.tsx                — Entry point, renders App into #root
  types.ts                — Flashcard & Deck type definitions
  index.css               — Tailwind base + CSS custom properties
  App.css                 — Unused (empty)
  components/
    Dashboard.tsx          — Analytics dashboard (stats, chart, heatmap)
    StudyArea.tsx          — SRS flashcard study session
    Sidebar.tsx            — App sidebar with navigation
    DeckView.tsx           — View/edit cards within a deck
    DeckLibrary.tsx        — Browse/ manage decks & folders
    CardModal.tsx          — Add/edit flashcard dialog
    TrashView.tsx          — Trash browser with restore/permanent delete
    SettingsModal.tsx      — Font selection settings
    EditDeck.tsx           — Deck editor (currently unused in App flow)
    EmptyState.tsx         — Empty state for DeckLibrary
    ImportCardsDialog.tsx  — CSV/text import dialog
    LibraryItem.tsx        — Single row in DeckLibrary list
    ui/                    — shadcn/ui primitives (21 components)
  hooks/
    use-mobile.tsx         — Mobile breakpoint detection (768px)
    use-toast.ts           — Toast notification state management
  lib/
    storage.ts             — IndexedDB persistence (via idb-keyval)
    srs.ts                 — Spaced repetition algorithm (SM-2 variant)
    utils.ts               — cn() classname merger (clsx + tailwind-merge)
  assets/                  — Static assets (hero.png, icons)
```

## Tech Stack & Key Dependencies

- **React 19** with TypeScript (strict, noUnusedLocals, noUnusedParameters)
- **Vite 8** — Build tool, dev server
- **Tailwind CSS 3** — Utility-first CSS, dark mode via `.dark` class
- **shadcn/ui** — UI component library (new-york style), built on Radix primitives
- **Recharts 2** — Charting (used in Dashboard)
- **react-day-picker 9** — Calendar component
- **idb-keyval 6** — Simple IndexedDB key-value storage
- **lucide-react** — Icons
- **date-fns** — Date utilities (listed, not yet heavily used)
- **ESLint** — Flat config with TypeScript + React hooks + refresh plugins

## Code Conventions

### Imports
- Use `@/` path alias for src imports (configured in tsconfig + vite)
- shadcn UI components imported from `@/components/ui/<name>`
- lib utilities from `@/lib/utils`
- Types from `@/types`

### Components
- Functional components with TypeScript interfaces for props
- Props interfaces named `ComponentNameProps`
- Components kept in `src/components/`, one file per major component
- Small sub-components (e.g., CardActions, TrashListItem) colocated in parent file

### State Management
- No external state library — vanilla React `useState` + `useEffect`
- All persistent state flows through `App.tsx` as the single source of truth
- Data persisted to IndexedDB via `lib/storage.ts` (saveDecks, getDecks)
- Activity log stored separately under a different key

### Styling
- Dark theme only (`.dark` class applied to `<html>` in `main.tsx`)
- Font via CSS custom property `--app-font`, defaulting to Inter
- Use `cn()` from `@/lib/utils` for conditional class merging
- Responsive patterns: mobile-first with `sm:`, `md:`, `lg:`, `xl:` breakpoints
- No hardcoded colors — use Tailwind semantic tokens (primary, muted, border, etc.)

### Types
- `Flashcard` — id, term, definition, SRS fields (nextReview, lastReview, interval, easeFactor, repetitions)
- `Deck` — id, title, description, cards[], parentId, isTrashed, isFolder, updatedAt

### Data Flow
1. App loads decks from IndexedDB on mount (or initializes with sample data)
2. All deck mutations call `updateDecks()` which sets state + persists
3. Sidebar, Library, DeckView, StudyArea all receive callbacks as props
4. View routing via `view` state: "dashboard" | "library" | "study" | "deck" | "trash" | "inbox"

## Notes

- The `Toaster` component exists but is not rendered — toast notifications are unimplemented
- The Import button in Sidebar has no handler — import is only available per-deck
- The `EditDeck` component is implemented but unused in the current App flow
- shadcn Breadcrumb, Sheet, Skeleton, and Calendar components are available but unused
- Git is initialized but has no commits yet
