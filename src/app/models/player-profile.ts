export interface MissingCardEntry {
  name: string;
  count: number;
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  deckList: string[];
  missingCards: MissingCardEntry[];
}
