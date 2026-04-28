import type { ClozeToken } from "@/types";

const CLOZE_REGEX = /\{\{c(\d+)::([\s\S]+?)(?:::([^}]*?))?\}\}/g;

export function parseCloze(text: string): ClozeToken[] {
  const tokens: ClozeToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(CLOZE_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, match.index), hidden: false });
    }
    tokens.push({
      text: match[2],
      hidden: true,
      index: parseInt(match[1]),
      hint: match[3] || undefined,
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex), hidden: false });
  }

  if (tokens.length === 0 && text.trim()) {
    tokens.push({ text, hidden: false });
  }

  return tokens;
}

export function stripCloze(text: string): string {
  return text.replace(CLOZE_REGEX, (_, _idx, inner) => `[${inner}]`);
}

export function previewCloze(text: string): string {
  return text.replace(CLOZE_REGEX, '[...]');
}

export function previewClozeWithHints(text: string): string {
  return text.replace(CLOZE_REGEX, (_, _idx, _inner, hint) => `[${hint || "..."}]`);
}

export function getClozeAnswers(text: string): string {
  const matches = [...text.matchAll(CLOZE_REGEX)];
  return matches.map(m => m[2]).join(", ");
}

export function hasClozeMarkers(text: string): boolean {
  const regex = new RegExp(CLOZE_REGEX.source, 'g');
  return regex.test(text);
}
