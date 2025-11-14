import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { CardCountEntry } from '../../models/player-profile';
import { CardPreviewDirective } from '../card-preview.directive';

@Component({
  selector: 'app-card-search-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, CardPreviewDirective],
  templateUrl: './card-search-panel.component.html',
  styleUrls: ['./card-search-panel.component.css'],
})
export class CardSearchPanelComponent {
  @Input() title = 'Search card database';
  @Input() description = 'Use filters to find cards and add them to the list.';
  @Input() selectedCards: CardCountEntry[] = [];
  @Input() maxCopies = Number.POSITIVE_INFINITY;

  @Output() addCard = new EventEmitter<string>();

  protected searchTerm = '';
  protected showFilters = false;
  protected showImages = false;

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
      this.cardDatabase.search(term, [...colors], [...types], 60)
    )
  );

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
    next.has(color) ? next.delete(color) : next.add(color);
    this.colorFilters$.next(next);
  }

  protected toggleType(type: string): void {
    const next = new Set(this.typeFilters$.value);
    next.has(type) ? next.delete(type) : next.add(type);
    this.typeFilters$.next(next);
  }

  protected isColorSelected(color: string): boolean {
    return this.colorFilters$.value.has(color);
  }

  protected isTypeSelected(type: string): boolean {
    return this.typeFilters$.value.has(type);
  }

  protected getTrackedCount(cardName: string): number {
    return (
      this.selectedCards.find(
        (entry) => entry.name.toLowerCase() === cardName.toLowerCase()
      )?.count ?? 0
    );
  }

  protected canAdd(cardName: string): boolean {
    return this.getTrackedCount(cardName) < this.maxCopies;
  }

  protected requestAdd(cardName: string): void {
    if (!this.canAdd(cardName)) {
      return;
    }
    this.addCard.emit(cardName);
  }

  protected trackByCardName(_: number, card: CardRecord): string {
    return card.name;
  }

  protected toggleView(): void {
    this.showImages = !this.showImages;
  }

  protected readableType(card: CardRecord): string {
    return card.type?.trim() || 'Unknown type';
  }

  protected readableColors(card: CardRecord): string {
    const colors = card.colors.filter(
      (color) => color.toLowerCase() !== 'origin'
    );
    return colors.length ? colors.join(', ') : 'No color';
  }

  protected previewData(card: CardRecord): { title: string; imageUrl: string } {
    return {
      title: card.name,
      imageUrl: card.imgUrl || card.filePath,
    };
  }
}
