export interface PlayerProfile {
  id: string;
  displayName: string;
  deckList: string[];
  missingCards: string[];
}

export const PLAYER_PROFILES: PlayerProfile[] = [
  {
    id: 'name-1',
    displayName: 'name-1',
    deckList: ['Starter Deck Alpha', 'Forest Guardians'],
    missingCards: ['Dragonfire Sigil', 'Whispering Oaks'],
  },
  {
    id: 'name-2',
    displayName: 'name-2',
    deckList: ['Arcane Tempest', 'Mechanized Might'],
    missingCards: ['Clockwork Drake', 'Temporal Shift'],
  },
  {
    id: 'name-3',
    displayName: 'name-3',
    deckList: ['Sunlit Crusaders'],
    missingCards: ['Radiant Shield', 'Luminous Blade'],
  },
];

export function listAllMissingCards(): string[] {
  const unique = new Set<string>();
  PLAYER_PROFILES.forEach((profile) => {
    profile.missingCards.forEach((card) => unique.add(card));
  });
  return Array.from(unique);
}

export function findPlayerById(id: string): PlayerProfile | undefined {
  return PLAYER_PROFILES.find((profile) => profile.id === id);
}
