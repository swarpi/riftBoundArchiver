import { Routes } from '@angular/router';
import { MainMenuComponent } from './features/main-menu/main-menu.component';
import { PlayerPageComponent } from './features/player-page/player-page.component';
import { AllMissingComponent } from './features/all-missing/all-missing.component';

export const routes: Routes = [
  { path: '', component: MainMenuComponent, title: 'Main Menu' },
  { path: 'players/:id', component: PlayerPageComponent, title: 'Player Summary' },
  { path: 'all-missing', component: AllMissingComponent, title: 'All Missing Cards' },
  { path: '**', redirectTo: '' },
];
