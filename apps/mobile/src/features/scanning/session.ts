/** A pause, timeout or focus change never proves another physical item arrived. */
export class ScanSession {
  private lastKey: string | null = null;
  private generation = 0;
  private busy = false;

  begin(key: string): number | null {
    if (this.busy || key === this.lastKey) return null;
    this.lastKey = key;
    this.busy = true;
    return ++this.generation;
  }
  isCurrent(generation: number): boolean { return generation === this.generation; }
  finish(generation: number): void { if (this.isCurrent(generation)) this.busy = false; }
  cancel(): void { this.generation++; this.busy = false; }
  repeatExplicitly(): void { this.cancel(); this.lastKey = null; }
}
