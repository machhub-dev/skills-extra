// The part of @machhub-dev/sdk-ts the HMI core uses. The real SDK satisfies it,
// and so does createSimSdk (hmi-sim.ts) for tests and offline work.

export type TagQuality = "good" | "uncertain" | "bad";

export interface TagMessageMeta {
  quality?: TagQuality;
  sourceTime?: string;
  status?: number;
  retained?: boolean;
}

export type AlarmPriority = "critical" | "high" | "medium" | "low";
export type AlarmStateName = "normal" | "unack" | "ack" | "cleared" | "shelved";

export interface AlarmLiveRow {
  rule: { id?: { Table: string; ID: string }; name: string; tag: string; priority: AlarmPriority; message?: string; equipment?: string; area?: string; allowShelve?: boolean; maxShelveMinutes?: number };
  state: { state: AlarmStateName; activeSince?: string; value?: unknown } | null;
}

export interface AlarmLiveSnapshot {
  version: number;
  serverTime: string;
  alarms: AlarmLiveRow[];
}

export interface HmiSdk {
  tag: {
    subscribe(topic: string, callback: (value: any, topic?: string, meta?: TagMessageMeta) => void): Promise<void>;
    unsubscribe(topic: string): Promise<void>;
    publish(topic: string, value: unknown, retain?: boolean): Promise<void>;
    /** Newer SDK builds. Without it the core assumes the link is up. */
    onConnectionChange?(listener: (connected: boolean) => void): () => void;
  };
  /** Newer SDK builds, on a server with the SDK alarm routes. Without it symbols show no alarms. */
  alarms?: {
    subscribe(callback: (snapshot: AlarmLiveSnapshot) => void, options?: { activeOnly?: boolean; intervalMs?: number; onError?: (error: unknown) => void }): () => void;
    ack(ruleIDs: string | string[], comment?: string): Promise<{ applied: string[]; skipped?: Record<string, string> }>;
    shelve(ruleIDs: string | string[], minutes: number, comment?: string): Promise<{ applied: string[]; skipped?: Record<string, string> }>;
  };
  auth?: {
    checkPermission(feature: string, action: string, scope: string): Promise<{ permission: boolean }>;
  };
}

/** "alarm_rules:abc" from a rule's RecordID. */
export function ruleKey(rule: AlarmLiveRow["rule"]): string {
  return rule.id ? `${rule.id.Table}:${rule.id.ID}` : rule.name;
}
