import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  switchMap,
} from 'rxjs';
import {
  CardDatabaseService,
  CardRecord,
} from '../../services/card-database.service';

interface DeckEntry {
  card: CardRecord;
  count: number;
}

@Component({
  selector: 'app-deck-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './deck-builder.component.html',
  styleUrls: ['./deck-builder.component.css'],
})
export class DeckBuilderComponent {
  protected searchTerm = '';
  protected showFilters = false;
  private readonly searchTerm$ = new BehaviorSubject<string>('');
  private readonly colorFilters$ = new BehaviorSubject<Set<string>>(new Set());
  private readonly typeFilters$ = new BehaviorSubject<Set<string>>(new Set());

  protected readonly availableColors = this.cardDatabase.getAvailableColors();
  protected readonly availableTypes$ = this.cardDatabase.listTypes();

  protected readonly searchResults$: Observable<CardRecord[]> = combineLatest([
    this.searchTerm$.pipe(debounceTime(200), distinctUntilChanged()),
    this.colorFilters$,
    this.typeFilters$,
  ]).pipe(
    switchMap(([term, colors, types]) =>
      this.cardDatabase.search(term, Array.from(colors), Array.from(types), 80)
    )
  );

  protected deckEntries: DeckEntry[] = [];
  protected totalCards = 0;

  private readonly deckMap = new Map<string, DeckEntry>();

  constructor(private readonly cardDatabase: CardDatabaseService) {}

  protected onSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.searchTerm$.next(value);
  }

  protected toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  protected toggleColor(color: string): void {
    const next = new Set(this.colorFilters$.value);
    if (next.has(color)) {
      next.delete(color);
    } else {
      next.add(color);
    }
    this.colorFilters$.next(next);
  }

  protected toggleType(type: string): void {
    const next = new Set(this.typeFilters$.value);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    this.typeFilters$.next(next);
  }

  protected isColorSelected(color: string): boolean {
    return this.colorFilters$.value.has(color);
  }

  protected isTypeSelected(type: string): boolean {
    return this.typeFilters$.value.has(type);
  }

  protected addToDeck(card: CardRecord): void {
    const key = card.name.toLowerCase();
    const entry = this.deckMap.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      this.deckMap.set(key, { card, count: 1 });
    }
    this.refreshDeck();
  }

  protected increment(cardName: string): void {
    const key = cardName.toLowerCase();
    const entry = this.deckMap.get(key);
    if (!entry) {
      return;
    }
    entry.count += 1;
    this.refreshDeck();
  }

  protected decrement(cardName: string): void {
    const key = cardName.toLowerCase();
    const entry = this.deckMap.get(key);
    if (!entry) {
      return;
    }
    entry.count -= 1;
    if (entry.count <= 0) {
      this.deckMap.delete(key);
    }
    this.refreshDeck();
  }

  protected remove(cardName: string): void {
    const key = cardName.toLowerCase();
    if (this.deckMap.delete(key)) {
      this.refreshDeck();
    }
  }

  protected clearDeck(): void {
    this.deckMap.clear();
    this.refreshDeck();
  }

  protected trackByCardName(_: number, entry: DeckEntry): string {
    return entry.card.name;
  }

  protected getDeckCount(cardName: string): number {
    return this.deckMap.get(cardName.toLowerCase())?.count ?? 0;
  }

  private refreshDeck(): void {
    this.deckEntries = Array.from(this.deckMap.values()).sort((a, b) =>
      a.card.name.localeCompare(b.card.name)
    );
    this.totalCards = this.deckEntries.reduce((sum, entry) => sum + entry.count, 0);
  }
}
