import { Directive, HostBinding, HostListener, Input } from '@angular/core';
import {
  CardPreviewPayload,
  CardPreviewService,
} from './card-preview.service';

@Directive({
  selector: '[appCardPreview]',
  standalone: true,
})
export class CardPreviewDirective {
  @Input('appCardPreview') preview?: CardPreviewPayload;

  @HostBinding('class.card-preview-trigger') readonly hostClass = true;
  @HostBinding('style.cursor') readonly cursor = 'zoom-in';
  @HostBinding('attr.tabindex') readonly tabIndex = 0;
  @HostBinding('attr.role') readonly role = 'button';

  constructor(private readonly previewService: CardPreviewService) {}

  @HostListener('click', ['$event'])
  handleClick(event: MouseEvent): void {
    this.openPreview(event);
  }

  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  handleKey(event: KeyboardEvent): void {
    this.openPreview(event);
  }

  private openPreview(event: Event): void {
    if (!this.preview?.imageUrl) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    this.previewService.open(this.preview);
  }
}
