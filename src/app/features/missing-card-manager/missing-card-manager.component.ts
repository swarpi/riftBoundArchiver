import { Component, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { CardCountEntry, PlayerProfile } from '../../models/player-profile';
import { UserDatabaseService } from '../../services/user-database.service';
import { CardSearchPanelComponent } from '../../shared/card-search-panel/card-search-panel.component';
import { CardDatabaseService, CardRecord } from '../../services/card-database.service';
import { CardPreviewDirective } from '../../shared/card-preview.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  selector: 'app-missing-card-manager',
  standalone: true,
  imports: [CommonModule, RouterModule, CardSearchPanelComponent, CardPreviewDirective],
  templateUrl: './missing-card-manager.component.html',
  styleUrls: ['./missing-card-manager.component.css'],
})
export class MissingCardManagerComponent {
  protected showCardImages = true;
  protected readonly IMAGE_COLUMN_OPTIONS = [2, 3, 4, 5];
  protected imageColumns = 4;
  protected compactSearchPanel = true;

  private cardLookup = new Map<string, CardRecord>();

  protected readonly player$: Observable<PlayerProfile | undefined> =
    this.route.paramMap.pipe(
      switchMap((params) => {
        const identifier = params.get('id');
        return identifier
          ? this.userDatabase.getPlayerById(identifier)
          : of(undefined);
      })
    );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly userDatabase: UserDatabaseService,
    private readonly destroyRef: DestroyRef,
    private readonly cardDatabase: CardDatabaseService
  ) {
    this.cardDatabase
      .indexedByName()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lookup) => (this.cardLookup = lookup));
  }

  protected addCard(playerId: string, cardName: string): void {
    this.userDatabase.addMissingCard(playerId, cardName);
  }

  protected decrementCard(playerId: string, cardName: string): void {
    this.userDatabase.removeMissingCard(playerId, cardName);
  }

  protected removeCard(playerId: string, cardName: string): void {
    this.userDatabase.setMissingCardCount(playerId, cardName, 0);
  }

  protected getTrackedCount(
    cardName: string,
    missingCards: CardCountEntry[]
  ): number {
    return (
      missingCards.find(
        (card) => card.name.toLowerCase() === cardName.toLowerCase()
      )?.count ?? 0
    );
  }

  protected trackByCardName(_: number, card: CardCountEntry): string {
    return card.name;
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

  protected totalCards(cards: CardCountEntry[]): number {
    return cards.reduce((sum, entry) => sum + entry.count, 0);
  }

  protected toggleCardView(): void {
    this.showCardImages = !this.showCardImages;
    if (!this.showCardImages) {
      this.imageColumns = 4;
    }
  }

  protected getCardImage(cardName: string): string | undefined {
    const normalized = cardName?.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }
    const record = this.cardLookup.get(normalized);
    return record?.imgUrl || record?.filePath;
  }

  protected setImageColumns(columns: number): void {
    this.imageColumns = columns;
  }

  protected toggleCompactSearchPanel(): void {
    this.compactSearchPanel = !this.compactSearchPanel;
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
}
