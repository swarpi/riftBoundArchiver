import { Routes } from '@angular/router';
import { MainMenuComponent } from './features/main-menu/main-menu.component';
import { PlayerPageComponent } from './features/player-page/player-page.component';
import { AllMissingComponent } from './features/all-missing/all-missing.component';
import { MissingCardManagerComponent } from './features/missing-card-manager/missing-card-manager.component';
import { DeckBuilderComponent } from './features/deck-builder/deck-builder.component';

export const routes: Routes = [
  { path: '', component: MainMenuComponent, title: 'Main Menu' },
  { path: 'players/:id', component: PlayerPageComponent, title: 'Player Summary' },
  {
    path: 'players/:id/missing',
    component: MissingCardManagerComponent,
    title: 'Manage Missing Cards',
  },
  {
    path: 'deck-builder',
    component: DeckBuilderComponent,
    title: 'Deck Builder',
  },
  { path: 'all-missing', component: AllMissingComponent, title: 'All Missing Cards' },
  { path: '**', redirectTo: '' },
];
