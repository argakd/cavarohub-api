export type TxStatus =
  | "WAITING_FOR_PAYMENT"
  | "WAITING_FOR_ADMIN_CONFIRMATION"
  | "DONE"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELED";

const ALLOWED_TRANSITIONS: Record<TxStatus, TxStatus[]> = {
  WAITING_FOR_PAYMENT: ["WAITING_FOR_ADMIN_CONFIRMATION", "EXPIRED", "CANCELED"],
  WAITING_FOR_ADMIN_CONFIRMATION: ["DONE", "REJECTED", "CANCELED"],
  DONE: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELED: [],
};

export function assertTransition(from: TxStatus, to: TxStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid transaction status transition: ${from} -> ${to}`);
  }
}

const ROLLBACK_STATUSES: TxStatus[] = ["REJECTED", "EXPIRED", "CANCELED"];

export function requiresRollback(status: TxStatus): boolean {
  return ROLLBACK_STATUSES.includes(status);
}

export function isUnpaidExpired(paymentDueAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= paymentDueAt.getTime();
}

export function isDecisionOverdue(decisionDueAt: Date | null, now: Date = new Date()): boolean {
  if (!decisionDueAt) return false;
  return now.getTime() >= decisionDueAt.getTime();
}

export const PAYMENT_WINDOW_MS = 2 * 60 * 60 * 1000;
export const DECISION_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
