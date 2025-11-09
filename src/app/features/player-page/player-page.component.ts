import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PlayerProfile, findPlayerById } from '../../data/players';

@Component({
  selector: 'app-player-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './player-page.component.html',
  styleUrls: ['./player-page.component.css'],
})
export class PlayerPageComponent {
  protected readonly player?: PlayerProfile;

  constructor(route: ActivatedRoute) {
    const identifier = route.snapshot.paramMap.get('id');
    this.player = identifier ? findPlayerById(identifier) : undefined;
  }
}
