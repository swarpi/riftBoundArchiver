import { Component, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  Observable,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardCountEntry, DeckDefinition, PlayerProfile } from '../../models/player-profile';
import { UserDatabaseService } from '../../services/user-database.service';
import { CardDatabaseService, CardRecord } from '../../services/card-database.service';
import { CardSearchPanelComponent } from '../../shared/card-search-panel/card-search-panel.component';
import { CardPreviewDirective } from '../../shared/card-preview.directive';

type CardCategoryKey = 'Legend' | 'Runes' | 'Battlefield' | 'Other';

interface CategorizedCardSection {
  key: CardCategoryKey;
  label: string;
  entries: CardCountEntry[];
}

const CARD_CATEGORY_ORDER: { key: CardCategoryKey; label: string }[] = [
  { key: 'Legend', label: 'Legends' },
  { key: 'Runes', label: 'Runes' },
  { key: 'Battlefield', label: 'Battlefield' },
  { key: 'Other', label: 'Everything else' },
];

@Component({
  selector: 'app-deck-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardSearchPanelComponent, CardPreviewDirective],
  templateUrl: './deck-builder.component.html',
  styleUrls: ['./deck-builder.component.css'],
})
export class DeckBuilderComponent {
  protected readonly MAX_COPIES = 3;
  protected renameDraft = '';
  protected workingDeck?: DeckDefinition;
  protected dirty = false;
  protected showImportModal = false;
  protected importText = '';
  protected importError = '';
  protected showCardImages = true;
  protected isEditing = false;
  protected readonly IMAGE_COLUMN_OPTIONS = [2, 3, 4, 5];
  protected imageColumns = 4;
  protected compactSearchPanel = true;

  private cardLookup = new Map<string, CardRecord>();

  private readonly deckId$ = this.route.paramMap.pipe(
    map((params) => params.get('deckId')),
    distinctUntilChanged()
  );

  protected readonly player$: Observable<PlayerProfile | undefined> =
    this.route.paramMap.pipe(
      switchMap((params) => {
        const identifier = params.get('id');
        return identifier
          ? this.userDatabase.getPlayerById(identifier)
          : of(undefined);
      })
    );

  protected readonly deck$: Observable<DeckDefinition | undefined> =
    combineLatest([this.player$, this.deckId$]).pipe(
      map(([player, deckId]) => {
        if (!player || !deckId) {
          return undefined;
        }
        return player.decks.find((deck) => deck.id === deckId);
      })
    );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly userDatabase: UserDatabaseService,
    private readonly destroyRef: DestroyRef,
    private readonly router: Router,
    private readonly cardDatabase: CardDatabaseService
  ) {
    this.deck$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((deck) => this.loadWorkingDeck(deck));

    this.cardDatabase
      .indexedByName()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lookup) => (this.cardLookup = lookup));
  }

  private loadWorkingDeck(deck?: DeckDefinition): void {
    if (!deck) {
      this.workingDeck = undefined;
      this.renameDraft = '';
      this.dirty = false;
      this.isEditing = false;
      return;
    }
    this.workingDeck = {
      id: deck.id,
      name: deck.name,
      cards: deck.cards.map((entry) => ({ ...entry })),
      sideboard: deck.sideboard?.map((entry) => ({ ...entry })),
    };
    this.renameDraft = deck.name;
    this.dirty = false;
  }

  protected toggleCardView(): void {
    this.showCardImages = !this.showCardImages;
    if (!this.showCardImages) {
      this.imageColumns = 4;
    }
  }

  protected toggleCompactSearchPanel(): void {
    this.compactSearchPanel = !this.compactSearchPanel;
  }

  protected getCardImage(cardName: string): string | undefined {
    const normalized = cardName?.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }
    const record = this.cardLookup.get(normalized);
    return record?.imgUrl || record?.filePath;
  }

  protected categorizeCards(cards: CardCountEntry[]): CategorizedCardSection[] {
    const groups = new Map<CardCategoryKey, CardCountEntry[]>();
    CARD_CATEGORY_ORDER.forEach(({ key }) => groups.set(key, []));
    cards.forEach((entry) => {
      const key = this.resolveCategory(entry.name);
      groups.get(key)?.push(entry);
    });
    return CARD_CATEGORY_ORDER
      .map(({ key, label }) => ({
        key,
        label,
        entries: groups.get(key) ?? [],
      }))
      .filter((section) => section.entries.length);
  }

  protected trackByCategory(_: number, section: CategorizedCardSection): CardCategoryKey {
    return section.key;
  }

  protected setImageColumns(columns: number): void {
    this.imageColumns = columns;
  }

  private resolveCategory(cardName: string): CardCategoryKey {
    const normalized = cardName.trim().toLowerCase();
    const record = this.cardLookup.get(normalized);
    const type = record?.type?.toLowerCase();
    if (type === 'legend') {
      return 'Legend';
    }
    if (type === 'rune') {
      return 'Runes';
    }
    if (type === 'battlefield') {
      return 'Battlefield';
    }
    return 'Other';
  }

  protected toggleEditing(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.closeImport();
    }
  }

  protected onDeckNameChange(value: string): void {
    this.renameDraft = value;
    this.markDirty();
  }

  protected saveDeck(playerId: string, deckId: string): void {
    if (!this.workingDeck) {
      return;
    }
    const trimmed = this.renameDraft.trim() || 'Untitled Deck';
    const payload: DeckDefinition = {
      ...this.workingDeck,
      name: trimmed,
    };
    this.userDatabase.saveDeck(playerId, payload);
    this.dirty = false;
  }

  protected addCard(cardName: string): void {
    if (!this.isEditing) {
      return;
    }
    this.applyCardDelta(cardName, 1);
  }

  protected decrementCard(cardName: string): void {
    if (!this.isEditing) {
      return;
    }
    this.applyCardDelta(cardName, -1);
  }

  protected removeCard(cardName: string): void {
    if (!this.isEditing) {
      return;
    }
    this.setCardCount(cardName, 0);
  }

  protected openImport(): void {
    if (!this.isEditing) {
      return;
    }
    this.importText = '';
    this.importError = '';
    this.showImportModal = true;
  }

  protected closeImport(): void {
    this.showImportModal = false;
    this.importText = '';
    this.importError = '';
  }

  protected applyImport(): void {
    if (!this.isEditing) {
      return;
    }
    if (!this.importText.trim()) {
      this.importError = 'Please paste a deck list.';
      return;
    }

    try {
      const parsed = this.parseDeckList(this.importText);
      if (!this.workingDeck) {
        return;
      }
      this.workingDeck = {
        ...this.workingDeck,
        cards: parsed.main,
        sideboard: parsed.sideboard,
      };
      this.markDirty();
      this.closeImport();
    } catch (error) {
      this.importError =
        error instanceof Error ? error.message : 'Unable to import deck list.';
    }
  }

  protected deleteDeck(playerId: string, deckId: string): void {
    const confirmed = window.confirm('Delete this deck? This action cannot be undone.');
    if (!confirmed) {
      return;
    }
    this.userDatabase.deleteDeck(playerId, deckId);
    this.router.navigate(['/players', playerId]);
  }

  protected trackByCardName(_: number, card: CardCountEntry): string {
    return card.name;
  }

  protected totalCards(cards: CardCountEntry[]): number {
    return cards.reduce((sum, entry) => sum + entry.count, 0);
  }

  protected canAdd(cardName: string): boolean {
    if (!this.workingDeck) {
      return false;
    }
    const count =
      this.workingDeck.cards.find(
        (card) => card.name.toLowerCase() === cardName.toLowerCase()
      )?.count ?? 0;
    return count < this.MAX_COPIES;
  }

  private applyCardDelta(cardName: string, delta: number): void {
    if (!this.workingDeck || delta === 0) {
      return;
    }
    const cards = this.workingDeck.cards;
    const normalized = cardName.trim();
    if (!normalized) {
      return;
    }
    const lower = normalized.toLowerCase();
    let updated = false;
    const nextCards = cards
      .map((entry) => {
        if (entry.name.toLowerCase() !== lower) {
          return entry;
        }
        updated = true;
        return { ...entry, count: Math.max(0, Math.min(this.MAX_COPIES, entry.count + delta)) };
      })
      .filter((entry) => entry.count > 0);
    if (!updated && delta > 0) {
      nextCards.push({ name: normalized, count: Math.min(this.MAX_COPIES, delta) });
    }
    this.workingDeck = {
      ...this.workingDeck,
      cards: this.sortEntries(nextCards),
    };
    this.markDirty();
  }

  private setCardCount(cardName: string, count: number): void {
    if (!this.workingDeck) {
      return;
    }
    const normalized = cardName.trim();
    if (!normalized) {
      return;
    }
    const sanitized = Math.max(0, Math.min(this.MAX_COPIES, Math.floor(count)));
    const lower = normalized.toLowerCase();
    const nextCards = this.workingDeck.cards
      .map((entry) =>
        entry.name.toLowerCase() === lower ? { ...entry, count: sanitized } : entry
      )
      .filter((entry) => entry.count > 0);
    if (!nextCards.some((entry) => entry.name.toLowerCase() === lower) && sanitized > 0) {
      nextCards.push({ name: normalized, count: sanitized });
    }
    this.workingDeck = {
      ...this.workingDeck,
      cards: this.sortEntries(nextCards),
    };
    this.markDirty();
  }

  private sortEntries(entries: CardCountEntry[]): CardCountEntry[] {
    return [...entries].sort((a, b) => a.name.localeCompare(b.name));
  }

  private markDirty(): void {
    this.dirty = true;
  }

  private parseDeckList(raw: string): { main: CardCountEntry[]; sideboard: CardCountEntry[] } {
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length);

    if (!lines.length) {
      throw new Error('Deck list is empty.');
    }

    const main = new Map<string, CardCountEntry>();
    const side = new Map<string, CardCountEntry>();
    let target = main;

    const addEntry = (collection: Map<string, CardCountEntry>, name: string, count: number) => {
      if (!name || count <= 0) {
        return;
      }
      const key = name.toLowerCase();
      const existing = collection.get(key);
      if (existing) {
        existing.count += count;
      } else {
        collection.set(key, { name, count });
      }
    };

    const pattern = /^(\d+)\s+(.+)$/;

    for (const line of lines) {
      if (/^sideboard[:]?$/i.test(line)) {
        target = side;
        continue;
      }

      const match = line.match(pattern);
      if (!match) {
        throw new Error(`Unable to parse line: "${line}"`);
      }

      const quantity = Number.parseInt(match[1], 10);
      const name = match[2].trim();
      addEntry(target, name, quantity);
    }

    if (!main.size) {
      throw new Error('No main deck cards detected.');
    }

    const toSortedArray = (map: Map<string, CardCountEntry>) =>
      Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

    return {
      main: toSortedArray(main),
      sideboard: toSortedArray(side),
    };
  }
}
