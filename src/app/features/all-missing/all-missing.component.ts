import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { UserDatabaseService } from '../../services/user-database.service';
import { CardCountEntry } from '../../models/player-profile';

@Component({
  selector: 'app-all-missing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './all-missing.component.html',
  styleUrls: ['./all-missing.component.css'],
})
export class AllMissingComponent {
  protected readonly headline = 'Here is a list of all our missing cards';
  protected readonly missingCards$: Observable<CardCountEntry[]> =
    this.userDatabase.listAllMissingCards();

  constructor(private readonly userDatabase: UserDatabaseService) {}
}
