import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { MissingCardEntry, PlayerProfile } from '../models/player-profile';

interface UserDatabasePayload {
  players: StoredPlayerProfile[];
}

type StoredMissingCard = MissingCardEntry | string;

interface StoredPlayerProfile extends Omit<PlayerProfile, 'missingCards'> {
  missingCards: StoredMissingCard[];
}

@Injectable({ providedIn: 'root' })
export class UserDatabaseService {
  private readonly storageKey = 'riftbound-user-db';
  private readonly defaultDataUrl = 'assets/data/userDatabase.json';
  private readonly playersSubject = new BehaviorSubject<PlayerProfile[]>([]);

  readonly players$ = this.playersSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    const stored = this.normalizePlayers(this.readFromStorage());
    if (stored.length) {
      this.playersSubject.next(stored);
    } else {
      this.http.get<UserDatabasePayload>(this.defaultDataUrl).subscribe({
        next: (payload) => this.playersSubject.next(this.normalizePlayers(payload.players)),
        error: (error) => {
          console.error('Failed to load user database', error);
          this.playersSubject.next([]);
        },
      });
    }

    this.players$.subscribe((players) => this.persist(players));
  }

  listPlayers(): Observable<PlayerProfile[]> {
    return this.players$;
  }

  getPlayerById(id: string): Observable<PlayerProfile | undefined> {
    return this.players$.pipe(map((players) => players.find((player) => player.id === id)));
  }

  listAllMissingCards(): Observable<MissingCardEntry[]> {
    return this.players$.pipe(
      map((players) => {
        const aggregated = new Map<string, MissingCardEntry>();
        players.forEach((player) =>
          player.missingCards.forEach((entry) => {
            const key = entry.name.toLowerCase();
            const existing = aggregated.get(key);
            if (existing) {
              existing.count += entry.count;
            } else {
              aggregated.set(key, { name: entry.name, count: entry.count });
            }
          })
        );
        return Array.from(aggregated.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      })
    );
  }

  addMissingCard(playerId: string, cardName: string, count = 1): void {
    this.adjustMissingCardCount(playerId, cardName, count);
  }

  removeMissingCard(playerId: string, cardName: string, count = 1): void {
    this.adjustMissingCardCount(playerId, cardName, -count);
  }

  setMissingCardCount(playerId: string, cardName: string, count: number): void {
    const players = this.playersSnapshot();
    const target = players.find((player) => player.id === playerId);
    if (!target) {
      return;
    }

    const normalizedName = cardName.trim();
    if (!normalizedName) {
      return;
    }

    const sanitizedCount = Math.max(0, Math.floor(count));
    const normalized = this.normalizeMissingCardList(target.missingCards);
    const key = normalizedName.toLowerCase();
    const updatedCards = normalized
      .map((entry) =>
        entry.name.toLowerCase() === key ? { ...entry, count: sanitizedCount } : entry
      )
      .filter((entry) => entry.count > 0);

    if (
      !updatedCards.some((entry) => entry.name.toLowerCase() === key) &&
      sanitizedCount > 0
    ) {
      updatedCards.push({ name: normalizedName, count: sanitizedCount });
    }

    this.setPlayers(
      players.map((player) =>
        player.id === playerId
          ? { ...player, missingCards: this.sortMissingCards(updatedCards) }
          : player
      )
    );
  }

  private playersSnapshot(): PlayerProfile[] {
    return this.playersSubject.getValue();
  }

  private setPlayers(players: PlayerProfile[]): void {
    this.playersSubject.next(players);
  }

  private readFromStorage(): StoredPlayerProfile[] | null {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as StoredPlayerProfile[]) : null;
    } catch (error) {
      console.warn('Unable to read user database cache', error);
      return null;
    }
  }

  private persist(players: PlayerProfile[]): void {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return;
    }

    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(players));
    } catch (error) {
      console.warn('Unable to persist user database cache', error);
    }
  }

  private normalizePlayers(players?: StoredPlayerProfile[] | null): PlayerProfile[] {
    if (!players?.length) {
      return [];
    }

    return players.map((player) => ({
      ...player,
      missingCards: this.sortMissingCards(
        this.normalizeMissingCardList(player.missingCards ?? [])
      ),
    }));
  }

  private normalizeMissingCardList(list: StoredMissingCard[]): MissingCardEntry[] {
    if (!Array.isArray(list)) {
      return [];
    }

    const aggregated = new Map<string, MissingCardEntry>();
    list.forEach((entry) => {
      const name =
        typeof entry === 'string'
          ? entry.trim()
          : (entry.name ?? '').trim();
      const count =
        typeof entry === 'string'
          ? 1
          : Math.max(0, Math.floor(entry.count ?? 0));

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

  private sortMissingCards(cards: MissingCardEntry[]): MissingCardEntry[] {
    return [...cards].sort((a, b) => a.name.localeCompare(b.name));
  }

  private adjustMissingCardCount(
    playerId: string,
    cardName: string,
    delta: number
  ): void {
    const normalizedName = cardName.trim();
    if (!normalizedName || delta === 0) {
      return;
    }

    const players = this.playersSnapshot();
    const playerIndex = players.findIndex((player) => player.id === playerId);
    if (playerIndex === -1) {
      return;
    }

    const target = players[playerIndex];
    const cards = this.normalizeMissingCardList(target.missingCards);
    const key = normalizedName.toLowerCase();
    let updated = false;

    const updatedCards = cards
      .map((entry) => {
        if (entry.name.toLowerCase() !== key) {
          return entry;
        }
        updated = true;
        return { ...entry, count: entry.count + delta };
      })
      .filter((entry) => entry.count > 0);

    if (!updated && delta > 0) {
      updatedCards.push({ name: normalizedName, count: delta });
    }

    this.setPlayers(
      players.map((player, index) =>
        index === playerIndex
          ? { ...player, missingCards: this.sortMissingCards(updatedCards) }
          : player
      )
    );
  }
}
