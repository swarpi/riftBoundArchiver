import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { PlayerProfile } from '../../models/player-profile';
import { UserDatabaseService } from '../../services/user-database.service';

@Component({
  selector: 'app-player-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './player-page.component.html',
  styleUrls: ['./player-page.component.css'],
})
export class PlayerPageComponent {
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
    private readonly userDatabase: UserDatabaseService
  ) {}
}
