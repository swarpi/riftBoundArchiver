import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
} from 'rxjs';
import { MissingCardEntry, PlayerProfile } from '../../models/player-profile';
import {
  CardDatabaseService,
  CardRecord,
} from '../../services/card-database.service';
import { UserDatabaseService } from '../../services/user-database.service';

@Component({
  selector: 'app-missing-card-manager',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './missing-card-manager.component.html',
  styleUrls: ['./missing-card-manager.component.css'],
})
export class MissingCardManagerComponent {
  protected searchTerm = '';
  protected showFilters = false;
  private readonly searchTerm$ = new BehaviorSubject<string>('');
  private readonly colorFilters$ = new BehaviorSubject<Set<string>>(new Set());
  private readonly typeFilters$ = new BehaviorSubject<Set<string>>(new Set());

  protected readonly player$: Observable<PlayerProfile | undefined> =
    this.route.paramMap.pipe(
      switchMap((params) => {
        const identifier = params.get('id');
        return identifier
          ? this.userDatabase.getPlayerById(identifier)
          : of(undefined);
      })
    );

  protected readonly availableColors = this.cardDatabase.getAvailableColors();
  protected readonly availableTypes$ = this.cardDatabase.listTypes();

  protected readonly searchResults$: Observable<CardRecord[]> =
    combineLatest([
      this.searchTerm$.pipe(debounceTime(200), distinctUntilChanged()),
      this.colorFilters$,
      this.typeFilters$,
    ]).pipe(
      switchMap(([term, colors, types]) =>
        this.cardDatabase.search(
          term,
          Array.from(colors),
          Array.from(types),
          60
        )
      )
    );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly cardDatabase: CardDatabaseService,
    private readonly userDatabase: UserDatabaseService
  ) {}

  protected onSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.searchTerm$.next(value);
  }

  protected toggleFilters(): void {
    this.showFilters = !this.showFilters;
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
    missingCards: MissingCardEntry[]
  ): number {
    return (
      missingCards.find(
        (card) => card.name.toLowerCase() === cardName.toLowerCase()
      )?.count ?? 0
    );
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

  protected trackByCardName(
    _: number,
    card: MissingCardEntry | CardRecord
  ): string {
    return card.name;
  }
}
