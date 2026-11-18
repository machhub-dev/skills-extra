import { ruleKey, type AlarmLiveRow, type AlarmLiveSnapshot, type AlarmPriority, type HmiSdk } from "./hmi-sdk";

/** What a symbol shows of its alarms: the worst one that still needs attention. */
export interface SymbolAlarm {
  /** "none" when nothing needs attention. */
  priority: AlarmPriority | "none";
  /** False while any shown alarm waits for an acknowledgement (it blinks). */
  acked: boolean;
  /** False when the worst alarm has returned to normal but is not acknowledged. */
  active: boolean;
  shelved: boolean;
  /** Rule ids ("alarm_rules:x") behind the symbol, for the faceplate's Ack. */
  ruleIds: string[];
}

export const NO_ALARM: SymbolAlarm = { priority: "none", acked: true, active: false, shelved: false, ruleIds: [] };

const RANK: Record<AlarmPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };

/** Folds the rows that belong to one symbol into what it shows. */
export function summarise(rows: AlarmLiveRow[]): SymbolAlarm {
  let worst: AlarmLiveRow | undefined;
  let acked = true;
  let shelved = false;
  for (const row of rows) {
    const s = row.state?.state ?? "normal";
    if (s === "shelved") shelved = true;
    if (s === "normal" || s === "shelved") continue;
    if (s !== "ack") acked = false;
    if (!worst || RANK[row.rule.priority] > RANK[worst.rule.priority]) worst = row;
  }
  if (!worst) return { ...NO_ALARM, shelved, ruleIds: rows.map((r) => ruleKey(r.rule)) };
  return {
    priority: worst.rule.priority,
    acked,
    active: worst.state?.state !== "cleared",
    shelved,
    ruleIds: rows.map((r) => ruleKey(r.rule)),
  };
}

/**
 * The live alarm list, shared by every symbol on a screen. One poll of
 * sdk.alarms for the whole app; a symbol listens for the rules on its topics.
 */
export class AlarmFeed {
  private rows: AlarmLiveRow[] = [];
  private listeners = new Set<() => void>();
  private stop: (() => void) | undefined;
  private _available: boolean;

  constructor(private sdk: HmiSdk, options: { intervalMs?: number; onError?: (e: unknown) => void } = {}) {
    this._available = !!sdk.alarms;
    this.stop = sdk.alarms?.subscribe((snap: AlarmLiveSnapshot) => {
      this.rows = snap.alarms;
      for (const l of this.listeners) l();
    }, { intervalMs: options.intervalMs ?? 2000, onError: options.onError });
  }

  /** False when the SDK has no alarms (older SDK); symbols then show none. */
  get available(): boolean {
    return this._available;
  }

  /** Every row: the alarm banner and summary read this. */
  all(): AlarmLiveRow[] {
    return this.rows;
  }

  /** Rows for the given rule ids, or else for rules watching any of `topics`. */
  rowsFor(topics: string[], ruleIds?: string[]): AlarmLiveRow[] {
    if (ruleIds?.length) return this.rows.filter((r) => ruleIds.includes(ruleKey(r.rule)));
    return this.rows.filter((r) => topics.includes(r.rule.tag));
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  ack(ruleIds: string[], comment?: string) {
    if (!this.sdk.alarms) throw new Error("This SDK has no alarms.");
    return this.sdk.alarms.ack(ruleIds, comment);
  }

  shelve(ruleIds: string[], minutes: number, comment?: string) {
    if (!this.sdk.alarms) throw new Error("This SDK has no alarms.");
    return this.sdk.alarms.shelve(ruleIds, minutes, comment);
  }

  dispose(): void {
    this.stop?.();
  }
}
