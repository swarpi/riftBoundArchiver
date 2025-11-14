import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { CardCountEntry, DeckDefinition, PlayerProfile } from '../models/player-profile';
import { firebaseConfig } from '../../environments/firebase-config';

interface StoredPlayerProfile {
  id?: string;
  displayName?: string;
  missingCards?: StoredCardEntry[];
  decks?: StoredDeck[];
}

type StoredDeck = {
  id?: string;
  name?: string;
  cards?: StoredCardEntry[];
  sideboard?: StoredCardEntry[];
};

type StoredCardEntry = CardCountEntry | string;
type RemotePlayersPayload = Record<string, StoredPlayerProfile> | StoredPlayerProfile[] | null;

const DEFAULT_PLAYERS: StoredPlayerProfile[] = [
  {
    id: 'dennis',
    displayName: 'Dennis',
    missingCards: [
      { name: 'Blazing Scorcher', count: 2 },
      { name: 'Radiant Shield', count: 1 },
    ],
    decks: [
      {
        id: 'dennis-alpha',
        name: 'Dennis Alpha',
        cards: [
          { name: 'Blazing Scorcher', count: 2 },
          { name: 'Whispering Oaks', count: 1 },
        ],
        sideboard: [{ name: 'Smoke Screen', count: 2 }],
      },
    ],
  },
  {
    id: 'lukas',
    displayName: 'Lukas',
    missingCards: [{ name: 'Clockwork Drake', count: 1 }],
    decks: [
      {
        id: 'lukas-mech',
        name: 'Mechanized Control',
        cards: [
          { name: 'Clockwork Drake', count: 2 },
          { name: 'Chemtech Enforcer', count: 1 },
        ],
        sideboard: [{ name: 'Thermo Beam', count: 2 }],
      },
    ],
  },
  {
    id: 'toan',
    displayName: 'Toan',
    missingCards: [{ name: 'Starfall Mystic', count: 3 }],
    decks: [
      {
        id: 'toan-starlight',
        name: 'Starlight Vigil',
        cards: [
          { name: 'Starfall Mystic', count: 3 },
          { name: 'Luminous Blade', count: 1 },
        ],
        sideboard: [{ name: 'Progress Day', count: 1 }],
      },
    ],
  },
  {
    id: 'tung',
    displayName: 'Tung',
    missingCards: [{ name: 'Temporal Shift', count: 2 }],
    decks: [
      {
        id: 'tung-tempest',
        name: 'Arcane Tempest',
        cards: [
          { name: 'Temporal Shift', count: 3 },
          { name: 'Adaptatron', count: 1 },
        ],
        sideboard: [{ name: 'Void Seeker', count: 2 }],
      },
    ],
  },
  {
    id: 'trung',
    displayName: 'Trung',
    missingCards: [{ name: 'Whispering Oaks', count: 2 }],
    decks: [
      {
        id: 'trung-forest',
        name: 'Forest Guardians',
        cards: [
          { name: 'Whispering Oaks', count: 2 },
          { name: 'Radiant Shield', count: 2 },
        ],
        sideboard: [{ name: 'Mega-Mech', count: 1 }],
      },
    ],
  },
  {
    id: 'tim',
    displayName: 'Tim',
    missingCards: [{ name: 'Dragonfire Sigil', count: 1 }],
    decks: [
      {
        id: 'tim-sigil',
        name: 'Sigil Surge',
        cards: [
          { name: 'Dragonfire Sigil', count: 2 },
          { name: 'Flame Chompers', count: 1 },
        ],
        sideboard: [{ name: 'Void Seeker', count: 1 }],
      },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class UserDatabaseService {
  private readonly playersSubject = new BehaviorSubject<PlayerProfile[]>([]);
  private readonly databaseUrl = (() => {
    const configRecord = firebaseConfig as Record<string, string | undefined>;
    const raw = firebaseConfig.databaseURL ?? configRecord['databaseUrl'] ?? '';
    return raw.replace(/\/$/, '');
  })();
  private readonly authQuery = firebaseConfig.apiKey ? `?auth=${firebaseConfig.apiKey}` : '';
  private deckCounter = 0;
  private isInitialized = false;

  readonly players$ = this.playersSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    if (this.databaseUrl) {
      this.fetchFromFirebase();
    } else {
      console.warn('Firebase database URL is not configured. Falling back to bundled seed data.');
      this.loadFallbackSeed();
    }
  }

  listPlayers(): Observable<PlayerProfile[]> {
    return this.players$;
  }

  getPlayerById(id: string): Observable<PlayerProfile | undefined> {
    return this.players$.pipe(map((players) => players.find((player) => player.id === id)));
  }

  listAllMissingCards(): Observable<CardCountEntry[]> {
    return this.players$.pipe(
      map((players) => {
        const aggregated = new Map<string, CardCountEntry>();
        players.forEach((player) => this.aggregateCards(player.missingCards, aggregated));
        return Array.from(aggregated.values()).sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  addMissingCard(playerId: string, cardName: string, count = 1): void {
    this.updatePlayer(playerId, (player) => ({
      ...player,
      missingCards: this.adjustEntries(player.missingCards, cardName, count),
    }));
  }

  removeMissingCard(playerId: string, cardName: string, count = 1): void {
    this.updatePlayer(playerId, (player) => ({
      ...player,
      missingCards: this.adjustEntries(player.missingCards, cardName, -count),
    }));
  }

  setMissingCardCount(playerId: string, cardName: string, count: number): void {
    this.updatePlayer(playerId, (player) => ({
      ...player,
      missingCards: this.setEntryCount(player.missingCards, cardName, count),
    }));
  }

  createDeck(playerId: string, name?: string): string | null {
    let createdDeckId: string | null = null;
    this.updatePlayer(playerId, (player) => {
      const deckId = this.generateDeckId();
      createdDeckId = deckId;
      const deckName = name?.trim() || this.generateDeckName(player);
      const decks = [...player.decks, { id: deckId, name: deckName, cards: [] }];
      return { ...player, decks };
    });
    return createdDeckId;
  }

  addDeckCard(playerId: string, deckId: string, cardName: string, count = 1): void {
    this.updatePlayer(playerId, (player) =>
      this.updateDeck(player, deckId, (deck) => ({
        ...deck,
        cards: this.adjustEntries(deck.cards, cardName, count, 3),
      }))
    );
  }

  removeDeckCard(playerId: string, deckId: string, cardName: string, count = 1): void {
    this.updatePlayer(playerId, (player) =>
      this.updateDeck(player, deckId, (deck) => ({
        ...deck,
        cards: this.adjustEntries(deck.cards, cardName, -count, 3),
      }))
    );
  }

  setDeckCardCount(playerId: string, deckId: string, cardName: string, count: number): void {
    this.updatePlayer(playerId, (player) =>
      this.updateDeck(player, deckId, (deck) => ({
        ...deck,
        cards: this.setEntryCount(deck.cards, cardName, count, 3),
      }))
    );
  }

  deleteDeck(playerId: string, deckId: string): void {
    this.updatePlayer(playerId, (player) => ({
      ...player,
      decks: player.decks.filter((deck) => deck.id !== deckId),
    }));
  }

  saveDeck(playerId: string, deck: DeckDefinition): void {
    this.updatePlayer(playerId, (player) =>
      this.updateDeck(player, deck.id, () => ({
        ...deck,
        cards: this.sortCardEntries(deck.cards),
      }))
    );
  }

  private fetchFromFirebase(): void {
    this.http
      .get<RemotePlayersPayload>(this.buildUrl('players'))
      .subscribe({
        next: (payload) => {
          const players = this.normalizePlayersFromRemote(payload);
          this.isInitialized = true;
          if (!players.length) {
            const seeded = this.normalizePlayersFromArray(DEFAULT_PLAYERS);
            this.setPlayers(seeded);
          } else {
            this.setPlayers(players, false);
          }
        },
        error: (error) => {
          console.error('Failed to load players from Firebase. Falling back to bundled data.', error);
          this.loadFallbackSeed();
        },
      });
  }

  private loadFallbackSeed(): void {
    const fallback = this.normalizePlayersFromArray(DEFAULT_PLAYERS);
    this.setPlayers(fallback);
    this.isInitialized = true;
  }

  private listSnapshot(): PlayerProfile[] {
    return this.playersSubject.getValue();
  }

  private setPlayers(players: PlayerProfile[], persist = true): void {
    this.playersSubject.next(players);
    if (persist && this.isInitialized) {
      this.persist(players);
    }
  }

  private updatePlayer(
    playerId: string,
    updater: (player: PlayerProfile) => PlayerProfile | undefined
  ): void {
    const players = this.listSnapshot();
    const index = players.findIndex((player) => player.id === playerId);
    if (index === -1) {
      return;
    }
    const next = updater(players[index]);
    if (!next) {
      return;
    }
    const clone = [...players];
    clone[index] = next;
    this.setPlayers(clone);
  }

  private updateDeck(
    player: PlayerProfile,
    deckId: string,
    projector: (deck: DeckDefinition) => DeckDefinition
  ): PlayerProfile {
    const deckIndex = player.decks.findIndex((deck) => deck.id === deckId);
    if (deckIndex === -1) {
      return player;
    }
    const decks = [...player.decks];
    decks[deckIndex] = projector(decks[deckIndex]);
    return { ...player, decks };
  }

  private persist(players: PlayerProfile[]): void {
    if (!this.databaseUrl) {
      return;
    }
    const payload = this.serializePlayers(players);
    this.http.put(this.buildUrl('players'), payload).subscribe({
      error: (error) => console.error('Failed to persist players to Firebase', error),
    });
  }

  private buildUrl(path: string): string {
    return `${this.databaseUrl}/${path}.json${this.authQuery}`;
  }

  private normalizePlayersFromRemote(payload: RemotePlayersPayload): PlayerProfile[] {
    if (!payload) {
      return [];
    }

    const entries = Array.isArray(payload)
      ? payload
          .filter((player): player is StoredPlayerProfile => Boolean(player))
          .map((player, index) => ({ key: player.id ?? `player-${index + 1}`, value: player }))
      : Object.entries(payload).map(([key, value]) => ({ key, value }));

    return entries.map(({ key, value }, index) => this.mapPlayerFromStored(key, value, index));
  }

  private normalizePlayersFromArray(players: StoredPlayerProfile[]): PlayerProfile[] {
    return players.map((player, index) => this.mapPlayerFromStored(player.id ?? `player-${index + 1}`, player, index));
  }

  private mapPlayerFromStored(key: string, stored: StoredPlayerProfile, position: number): PlayerProfile {
    const id = stored.id ?? key ?? `player-${position + 1}`;
    return {
      id,
      displayName: stored.displayName ?? id,
      missingCards: this.sortCardEntries(this.normalizeCardList(stored.missingCards ?? [])),
      decks: this.normalizeDecks(stored.decks ?? []),
    };
  }

  private normalizeDecks(decks: StoredDeck[]): DeckDefinition[] {
    if (!decks?.length) {
      return [];
    }

    return decks.map((deck, index) => ({
      id: deck.id ?? this.generateDeckId(),
      name: deck.name?.trim() || `Deck ${index + 1}`,
      cards: this.sortCardEntries(this.normalizeCardList(deck.cards ?? [])),
      sideboard: this.sortCardEntries(this.normalizeCardList(deck.sideboard ?? [])),
    }));
  }

  private normalizeCardList(list: StoredCardEntry[]): CardCountEntry[] {
    if (!Array.isArray(list)) {
      return [];
    }

    const aggregated = new Map<string, CardCountEntry>();
    list.forEach((entry) => {
      const name = (typeof entry === 'string' ? entry : entry.name)?.trim();
      const count = typeof entry === 'string' ? 1 : Math.max(0, Math.floor(entry.count ?? 0));
      if (!name || count <= 0) {
        return;
      }
      const key = name.toLowerCase();
      const existing = aggregated.get(key);
      if (existing) {
        existing.count += count;
      } else {
        aggregated.set(key, { name, count });
      }
    });

    return Array.from(aggregated.values());
  }

  private sortCardEntries(cards: CardCountEntry[]): CardCountEntry[] {
    return [...cards].sort((a, b) => a.name.localeCompare(b.name));
  }

  private adjustEntries(
    entries: CardCountEntry[],
    cardName: string,
    delta: number,
    max = Number.POSITIVE_INFINITY
  ): CardCountEntry[] {
    const normalized = cardName.trim();
    if (!normalized || delta === 0) {
      return entries;
    }
    const lower = normalized.toLowerCase();
    let updated = false;
    const next = entries
      .map((entry) => {
        if (entry.name.toLowerCase() !== lower) {
          return entry;
        }
        updated = true;
        return { ...entry, count: Math.max(0, Math.min(max, entry.count + delta)) };
      })
      .filter((entry) => entry.count > 0);
    if (!updated && delta > 0) {
      next.push({ name: normalized, count: Math.min(max, delta) });
    }
    return this.sortCardEntries(next);
  }

  private setEntryCount(
    entries: CardCountEntry[],
    cardName: string,
    count: number,
    max = Number.POSITIVE_INFINITY
  ): CardCountEntry[] {
    const normalized = cardName.trim();
    if (!normalized) {
      return entries;
    }
    const sanitized = Math.max(0, Math.min(max, Math.floor(count)));
    const lower = normalized.toLowerCase();
    const next = entries
      .map((entry) =>
        entry.name.toLowerCase() === lower ? { ...entry, count: sanitized } : entry
      )
      .filter((entry) => entry.count > 0);
    if (!next.some((entry) => entry.name.toLowerCase() === lower) && sanitized > 0) {
      next.push({ name: normalized, count: sanitized });
    }
    return this.sortCardEntries(next);
  }

  private aggregateCards(
    entries: CardCountEntry[],
    bucket: Map<string, CardCountEntry>
  ): void {
    entries?.forEach((entry) => {
      const key = entry.name.toLowerCase();
      const existing = bucket.get(key);
      if (existing) {
        existing.count += entry.count;
      } else {
        bucket.set(key, { name: entry.name, count: entry.count });
      }
    });
  }

  private serializePlayers(players: PlayerProfile[]): Record<string, StoredPlayerProfile> {
    const payload: Record<string, StoredPlayerProfile> = {};
    players.forEach((player) => {
      payload[player.id] = {
        displayName: player.displayName,
        missingCards: player.missingCards.map((entry) => ({ ...entry })),
        decks: player.decks.map((deck) => ({
          id: deck.id,
          name: deck.name,
          cards: deck.cards.map((card) => ({ ...card })),
          sideboard: deck.sideboard?.map((card) => ({ ...card })) ?? [],
        })),
      };
    });
    return payload;
  }

  private generateDeckId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    this.deckCounter += 1;
    return `deck-${Date.now()}-${this.deckCounter}`;
  }

  private generateDeckName(player: PlayerProfile): string {
    return `Deck ${player.decks.length + 1}`;
  }
}
