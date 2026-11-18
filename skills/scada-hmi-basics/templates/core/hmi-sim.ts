import type { AlarmLiveRow, AlarmLiveSnapshot, AlarmPriority, AlarmStateName, HmiSdk, TagMessageMeta, TagQuality } from "./hmi-sdk";

/**
 * An in-memory stand-in for the SDK: tags, a broker that echoes publishes
 * and keeps retained values, alarm rules with the ISA-18.2 states, source
 * health and the link. For Playwright checks, Storybook-style previews and
 * working without a runtime. Never ship it as the data path.
 *
 * Drive it from a test with the returned controls, or expose them on
 * window (see the skill's tests template).
 */
export interface SimRule {
  id: string; // "alarm_rules:pump101_trip"
  name: string;
  tag: string;
  priority: AlarmPriority;
  /** Raised while it returns true for the tag's value. */
  when: (value: unknown) => boolean;
  message?: string;
}

export interface SimDevice {
  /** A write to `command` makes the device report `feedback` after `delayMs`. */
  command: string;
  feedback: string;
  /** Default: the written value. */
  map?: (written: unknown) => unknown;
  delayMs?: number;
}

export interface SimControls {
  sdk: HmiSdk;
  /** Publishes as an adapter would: with a quality (default good). */
  set(topic: string, value: unknown, quality?: TagQuality): void;
  /** The link: false fires onConnectionChange(false). */
  setConnected(up: boolean): void;
  /** Source health, as on _MACHHUB/datasources/health. */
  setSource(id: string, health: { running?: boolean; connected?: boolean; failingPoints?: string[] }): void;
  /** Everything clients published, in order. */
  published: { topic: string; value: unknown }[];
  /** The permission checkPermission answers. */
  permit(allowed: boolean): void;
  /** Forces an alarm poll now instead of waiting for the interval. */
  pollAlarms(): void;
}

export function createSimSdk(options: { rules?: SimRule[]; devices?: SimDevice[]; initial?: Record<string, unknown>; allowed?: boolean } = {}): SimControls {
  const handlers = new Map<string, (v: unknown, t?: string, m?: TagMessageMeta) => void>();
  const retained = new Map<string, { value: unknown; meta: TagMessageMeta }>();
  const linkListeners = new Set<(up: boolean) => void>();
  const alarmSubs = new Set<() => void>();
  const published: { topic: string; value: unknown }[] = [];
  let connected = true;
  let allowed = options.allowed ?? true;
  let version = 0;

  const rules = options.rules ?? [];
  const states = new Map<string, { state: AlarmStateName; activeSince?: string; value?: unknown }>();
  for (const r of rules) states.set(r.id, { state: "normal" });

  const matches = (pattern: string, topic: string) => {
    if (pattern === topic) return true;
    const p = pattern.split("/");
    const t = topic.split("/");
    for (let i = 0; i < p.length; i++) {
      if (p[i] === "#") return true;
      if (p[i] !== "+" && p[i] !== t[i]) return false;
    }
    return p.length === t.length;
  };

  const deliver = (topic: string, value: unknown, meta: TagMessageMeta) => {
    if (!connected) return;
    for (const [pattern, h] of handlers) {
      if (matches(pattern, topic)) {
        h(value, topic, meta);
        break; // the SDK's first-match rule
      }
    }
  };

  const evaluate = (topic: string, value: unknown) => {
    let changed = false;
    for (const r of rules.filter((r) => r.tag === topic)) {
      const s = states.get(r.id)!;
      const on = r.when(value);
      const before = s.state;
      if (s.state === "shelved") continue;
      if (on && (s.state === "normal" || s.state === "cleared")) s.state = "unack";
      if (on && !s.activeSince) s.activeSince = new Date().toISOString();
      if (!on && s.state === "unack") s.state = "cleared";
      if (!on && s.state === "ack") s.state = "normal";
      if (!on) s.activeSince = undefined;
      s.value = value;
      changed ||= before !== s.state;
    }
    if (changed) version++;
  };

  const publish = (topic: string, value: unknown, meta: TagMessageMeta, retain: boolean) => {
    if (retain) retained.set(topic, { value, meta: { ...meta, retained: true } });
    evaluate(topic, value);
    deliver(topic, value, { ...meta, retained: false });
  };

  const set = (topic: string, value: unknown, quality: TagQuality = "good") =>
    publish(topic, value, { quality, sourceTime: new Date().toISOString() }, true);

  for (const [t, v] of Object.entries(options.initial ?? {})) set(t, v);

  const snapshot = (): AlarmLiveSnapshot => ({
    version,
    serverTime: new Date().toISOString(),
    alarms: rules.map((r): AlarmLiveRow => {
      const [Table, ID] = r.id.split(":");
      return { rule: { id: { Table, ID }, name: r.name, tag: r.tag, priority: r.priority, message: r.message, allowShelve: true, maxShelveMinutes: 480 }, state: { ...states.get(r.id)! } };
    }),
  });

  const act = (ids: string | string[], fn: (s: { state: AlarmStateName }) => boolean) => {
    const applied: string[] = [];
    const skipped: Record<string, string> = {};
    for (const id of Array.isArray(ids) ? ids : [ids]) {
      const s = states.get(id);
      if (s && fn(s)) applied.push(id);
      else skipped[id] = "not applicable";
    }
    if (applied.length) version++;
    for (const l of alarmSubs) l();
    return Promise.resolve({ applied, skipped });
  };

  const sdk: HmiSdk = {
    tag: {
      async subscribe(topic, cb) {
        handlers.set(topic, cb);
        for (const [t, r] of retained) if (matches(topic, t) && connected) cb(r.value, t, r.meta);
      },
      async unsubscribe(topic) {
        handlers.delete(topic);
      },
      async publish(topic, value, retain = true) {
        if (!connected) throw new Error("MQTT service not connected");
        published.push({ topic, value });
        publish(topic, value, { retained: false }, retain); // a client publish carries no quality
        for (const d of options.devices ?? []) {
          if (d.command === topic) setTimeout(() => set(d.feedback, d.map ? d.map(value) : value), d.delayMs ?? 300);
        }
      },
      onConnectionChange(listener) {
        linkListeners.add(listener);
        listener(connected);
        return () => linkListeners.delete(listener);
      },
    },
    alarms: {
      subscribe(cb, opts = {}) {
        let last = -1;
        const tick = () => {
          const snap = snapshot();
          if (snap.version !== last) {
            last = snap.version;
            cb(opts.activeOnly ? { ...snap, alarms: snap.alarms.filter((a) => a.state?.state !== "normal") } : snap);
          }
        };
        alarmSubs.add(tick);
        tick();
        const timer = setInterval(tick, opts.intervalMs ?? 2000);
        return () => {
          clearInterval(timer);
          alarmSubs.delete(tick);
        };
      },
      ack: (ids) => act(ids, (s) => {
        if (s.state === "unack") return (s.state = "ack"), true;
        if (s.state === "cleared") return (s.state = "normal"), true;
        return false;
      }),
      shelve: (ids) => act(ids, (s) => (s.state === "shelved" ? false : ((s.state = "shelved"), true))),
    },
    auth: {
      async checkPermission() {
        return { permission: allowed };
      },
    },
  };

  return {
    sdk,
    set,
    published,
    setConnected(up) {
      if (up === connected) return;
      connected = up;
      for (const l of linkListeners) l(up);
      if (up) for (const [pattern, h] of handlers) for (const [t, r] of retained) if (matches(pattern, t)) h(r.value, t, r.meta);
    },
    setSource(id, health) {
      const key = id.includes(":") ? id.split(":")[1] : id;
      const msg = { id, name: key, running: health.running ?? true, connected: health.connected ?? true, failingPoints: health.failingPoints ?? [] };
      publish(`_MACHHUB/datasources/health/sim/${key}`, msg, {}, true);
    },
    permit(a) {
      allowed = a;
    },
    pollAlarms() {
      for (const l of alarmSubs) l();
    },
  };
}
