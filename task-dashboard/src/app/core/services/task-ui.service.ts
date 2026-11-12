import { Injectable, signal } from '@angular/core';

/** Cross-layout UI events (e.g. sidebar “New Task” → dashboard dialog). */
@Injectable({ providedIn: 'root' })
export class TaskUiService {
  private readonly createTickState = signal(0);

  readonly createTick = this.createTickState.asReadonly();

  requestCreate(): void {
    this.createTickState.update((n) => n + 1);
  }
}
