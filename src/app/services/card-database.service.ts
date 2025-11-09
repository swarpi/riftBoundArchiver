import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';

export interface CardRecord {
  name: string;
  imgUrl: string;
  filePath: string;
  colors: string[];
  set?: string;
  type?: string;
}

interface CardMetadataEntry {
  name: string;
  img_url: string;
  file_path: string;
  color?: string;
  set?: string;
  type?: string;
}

const COLOR_FILTERS = ['Chaos', 'Calm', 'Fury', 'Mind', 'Body', 'Order'];

@Injectable({ providedIn: 'root' })
export class CardDatabaseService {
  private readonly cardDatabaseUrl = 'cardDatabase/cardMetaData.json';

  private readonly cards$: Observable<CardRecord[]> = this.http
    .get<CardMetadataEntry[]>(this.cardDatabaseUrl)
    .pipe(
      map((payload) =>
        payload
          .map((entry) => this.normalizeEntry(entry))
          .filter((record) => Boolean(record.name))
          .sort((a, b) => a.name.localeCompare(b.name))
      ),
      catchError((error) => {
        console.error('Failed to load card metadata', error);
        return of([] as CardRecord[]);
      }),
      shareReplay(1)
    );

  private readonly types$: Observable<string[]> = this.cards$.pipe(
    map((cards) =>
      Array.from(
        new Set(cards.map((card) => (card.type ?? 'Unknown').trim()))
      )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
    ),
    shareReplay(1)
  );

  constructor(private readonly http: HttpClient) {}

  listAll(): Observable<CardRecord[]> {
    return this.cards$;
  }

  listTypes(): Observable<string[]> {
    return this.types$;
  }

  getAvailableColors(): string[] {
    return COLOR_FILTERS;
  }

  search(
    term: string,
    colors: string[] = [],
    types: string[] = [],
    limit = 40
  ): Observable<CardRecord[]> {
    const normalizedTerm = term.trim().toLowerCase();
    const colorSet = new Set(colors.map((color) => color.toLowerCase()));
    const typeSet = new Set(types.map((type) => type.toLowerCase()));

    return this.cards$.pipe(
      map((cards) =>
        cards
          .filter((card) => {
            const matchesTerm =
              !normalizedTerm ||
              card.name.toLowerCase().includes(normalizedTerm) ||
              (card.type ?? '').toLowerCase().includes(normalizedTerm);

            const matchesColor =
              !colorSet.size ||
              card.colors.some((color) => colorSet.has(color.toLowerCase()));

            const matchesType =
              !typeSet.size ||
              (card.type ? typeSet.has(card.type.toLowerCase()) : false);

            return matchesTerm && matchesColor && matchesType;
          })
          .slice(0, limit)
      )
    );
  }

  findByName(name: string): Observable<CardRecord | undefined> {
    const normalized = name.trim().toLowerCase();
    return this.cards$.pipe(
      map((cards) => cards.find((card) => card.name.toLowerCase() === normalized))
    );
  }

  private normalizeEntry(entry: CardMetadataEntry): CardRecord {
    return {
      name: entry.name?.trim() ?? '',
      imgUrl: entry.img_url?.trim() ?? '',
      filePath: entry.file_path?.trim() ?? '',
      colors: this.parseColors(entry.color),
      set: entry.set?.trim() ?? undefined,
      type: entry.type?.trim() ?? undefined,
    };
  }

  private parseColors(colorField?: string): string[] {
    if (!colorField) {
      return [];
    }

    return colorField
      .split(',')
      .map((color) => color.trim())
      .filter(Boolean);
  }
}
