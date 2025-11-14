import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CardPreviewOverlayComponent } from './shared/card-preview-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CardPreviewOverlayComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'Rift Bound Archiver';
}
