import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardPreviewService } from './card-preview.service';

@Component({
  selector: 'app-card-preview-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-preview-overlay.component.html',
  styleUrls: ['./card-preview-overlay.component.css'],
})
export class CardPreviewOverlayComponent {
  protected readonly preview$ = this.previewService.preview$;

  constructor(private readonly previewService: CardPreviewService) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  protected close(): void {
    this.previewService.close();
  }

  protected stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }
}
