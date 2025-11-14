export interface CardCountEntry {
  name: string;
  count: number;
}

export interface DeckDefinition {
  id: string;
  name: string;
  cards: CardCountEntry[];
  sideboard?: CardCountEntry[];
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  decks: DeckDefinition[];
  missingCards: CardCountEntry[];
}
