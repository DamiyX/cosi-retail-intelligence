export type SaleDraftExitReason = 'cart' | 'line' | 'quick-add';

export interface SaleDraftExit {
  reason: SaleDraftExitReason;
  /** Discard all in-memory sale/product-draft input before leaving Sell. */
  discard: () => void;
}

export function saleDraftExitCopy(reason: SaleDraftExitReason): { title: string; message: string } {
  switch (reason) {
    case 'quick-add':
      return {
        title: 'Discard product and sale?',
        message: 'Your product entries and uncompleted sale will be lost.',
      };
    case 'line':
      return {
        title: 'Discard line and sale?',
        message: 'Your line changes and uncompleted sale will be lost.',
      };
    default:
      return { title: 'Discard sale?', message: 'Your uncompleted sale will be lost.' };
  }
}
