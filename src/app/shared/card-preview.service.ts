import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CardPreviewPayload {
  title: string;
  imageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class CardPreviewService {
  private readonly previewSubject = new BehaviorSubject<CardPreviewPayload | undefined>(undefined);

  readonly preview$: Observable<CardPreviewPayload | undefined> = this.previewSubject.asObservable();

  open(preview: CardPreviewPayload | undefined): void {
    if (!preview?.imageUrl) {
      return;
    }
    this.previewSubject.next(preview);
  }

  close(): void {
    this.previewSubject.next(undefined);
  }
}
