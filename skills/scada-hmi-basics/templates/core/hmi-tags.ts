import type { HmiSdk, TagMessageMeta, TagQuality } from "./hmi-sdk";

/** One live value and what is known about it. */
export interface TagReading {
  value: unknown;
  /** Date.now() when it arrived. */
  at: number;
  quality?: TagQuality;
  sourceTime?: string;
}

/** A data source's health, from _MACHHUB/datasources/health/<workspace>/<source>. */
export interface SourceHealth {
  id: string;
  name: string;
  running: boolean;
  connected: boolean;
  failingPoints?: string[];
}

const HEALTH_TOPIC = "_MACHHUB/datasources/health/+/+";

type ReadingListener = (reading: TagReading) => void;

/**
 * The one place the HMI talks to sdk.tag. The SDK keeps one handler per topic
 * string, so every component goes through this hub: it subscribes once per
 * exact topic and fans each value out to every listener.
 *
 * It also tracks the live-data link and each data source's health, which
 * observeSymbol turns into a symbol's data quality.
 */
export class TagHub {
  private listeners = new Map<string, Set<ReadingListener>>();
  private readings = new Map<string, TagReading>();
  private sources = new Map<string, SourceHealth>();
  private failing = new Set<string>();
  private healthListeners = new Set<() => void>();
  private linkListeners = new Set<(up: boolean) => void>();
  private _connected = true;
  private stopLink: (() => void) | undefined;
  private healthWatched = false;

  constructor(private sdk: HmiSdk) {
    if (sdk.tag.onConnectionChange) {
      this.stopLink = sdk.tag.onConnectionChange((up) => {
        this._connected = up;
        for (const l of this.linkListeners) l(up);
      });
    }
  }

  /** Whether the live-data link is up. */
  get connected(): boolean {
    return this._connected;
  }

  onConnection(listener: (up: boolean) => void): () => void {
    this.linkListeners.add(listener);
    listener(this._connected);
    return () => this.linkListeners.delete(listener);
  }

  /**
   * Calls `listener` with every value on one exact topic (no wildcards), and
   * at once with the last value if there is one. Returns an unsubscribe.
   */
  watch(topic: string, listener: ReadingListener): () => void {
    if (/[+#]/.test(topic)) throw new Error(`TagHub.watch takes an exact topic, not "${topic}".`);
    let set = this.listeners.get(topic);
    if (!set) {
      // Listener first: a retained value can arrive before subscribe returns.
      set = new Set([listener]);
      this.listeners.set(topic, set);
      void this.sdk.tag.subscribe(topic, (value: unknown, _t?: string, meta?: TagMessageMeta) => {
        const reading: TagReading = { value, at: Date.now(), quality: meta?.quality, sourceTime: meta?.sourceTime };
        this.readings.set(topic, reading);
        for (const l of this.listeners.get(topic) ?? []) l(reading);
      });
    } else {
      set.add(listener);
      const last = this.readings.get(topic);
      if (last) listener(last);
    }
    return () => {
      const s = this.listeners.get(topic);
      if (!s) return;
      s.delete(listener);
      if (s.size === 0) {
        this.listeners.delete(topic);
        this.readings.delete(topic);
        void this.sdk.tag.unsubscribe(topic);
      }
    };
  }

  last(topic: string): TagReading | undefined {
    return this.readings.get(topic);
  }

  /** Publishes a value. Commands go through writeAndConfirm (hmi-write.ts). */
  publish(topic: string, value: unknown, retain = true): Promise<void> {
    return this.sdk.tag.publish(topic, value, retain);
  }

  /**
   * Follows every data source's health (retained, so it arrives at once).
   * Called by observeSymbol; safe to call more than once.
   */
  watchSourceHealth(): void {
    if (this.healthWatched) return;
    this.healthWatched = true;
    void this.sdk.tag.subscribe(HEALTH_TOPIC, (msg: unknown, topic?: string) => {
      const key = topic?.split("/").pop() ?? "";
      if (!msg || typeof msg !== "object") this.sources.delete(key); // cleared: source deleted
      else this.sources.set(key, msg as SourceHealth);
      this.failing = new Set([...this.sources.values()].flatMap((s) => s.failingPoints ?? []));
      for (const l of this.healthListeners) l();
    });
  }

  onHealth(listener: () => void): () => void {
    this.healthListeners.add(listener);
    return () => this.healthListeners.delete(listener);
  }

  /** Whether the source that reads `topic` reports it failing. */
  isFailing(topic: string): boolean {
    return this.failing.has(topic);
  }

  /**
   * Whether a data source is down (stopped or link lost). `source` is its id
   * ("datasources:plc1") or the key after the colon. Unknown sources are up.
   */
  sourceDown(source: string): boolean {
    const key = source.includes(":") ? source.split(":")[1] : source;
    const s = this.sources.get(key);
    return s ? !s.running || !s.connected : false;
  }

  /** Stops the link listener. Topic watches end with their own unsubscribes. */
  dispose(): void {
    this.stopLink?.();
  }
}
