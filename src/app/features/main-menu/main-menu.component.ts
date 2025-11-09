import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { PlayerProfile } from '../../models/player-profile';
import { UserDatabaseService } from '../../services/user-database.service';

@Component({
  selector: 'app-main-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.css'],
})
export class MainMenuComponent {
  protected readonly players$: Observable<PlayerProfile[]> =
    this.userDatabase.listPlayers();

  constructor(private readonly userDatabase: UserDatabaseService) {}

  protected trackByPlayerId(_: number, player: PlayerProfile): string {
    return player.id;
  }
}
