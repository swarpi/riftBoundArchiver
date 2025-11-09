import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { listAllMissingCards } from '../../data/players';

@Component({
  selector: 'app-all-missing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './all-missing.component.html',
  styleUrls: ['./all-missing.component.css'],
})
export class AllMissingComponent {
  protected readonly headline = 'Here is a list of all our missing cards';
  protected readonly missingCards = listAllMissingCards();
}
