import { NO_ALARM, summarise, type AlarmFeed, type SymbolAlarm } from "./hmi-alarms";
import type { TagHub, TagReading } from "./hmi-tags";

export type RunState = "stopped" | "running" | "starting" | "stopping" | "fault";
export type ValvePosition = "open" | "closed" | "travel";
export type Mode = "auto" | "manual" | "maintenance";
export type Flow = "forward" | "reverse" | "none";

/**
 * How far a symbol's data can be trusted, worst first:
 * comms-lost (link or source down), bad, stale (opt-in timer), uncertain, good.
 */
export type Quality = "good" | "uncertain" | "stale" | "bad" | "comms-lost";

/** A topic, or a topic plus a function that turns its value into the state. */
export type Bound<T> = string | { topic: string; map?: (value: unknown) => T };

export interface SymbolBinding {
  run?: Bound<RunState>;
  /** Shown in the symbol's [data-part="value"]. */
  value?: string | { topic: string; format?: (value: unknown) => string };
  /** Fill level; the raw value is scaled from min..max (default 0..100) to 0..1. */
  level?: string | { topic: string; min?: number; max?: number };
  position?: Bound<ValvePosition>;
  mode?: Bound<Mode>;
  /** For pipes ([data-pipe]): flow direction, sets data-flow. */
  flow?: Bound<Flow>;
  /** Alarm rule ids to show. Default: rules whose tag is one of this symbol's topics. */
  alarmRules?: string[];
  /** Data source id ("datasources:plc1"); its link loss shows comms-lost. */
  source?: string;
  /**
   * Off by default. Milliseconds without a new value before the symbol shows
   * stale. Only for sources that publish on every read: MACHHUB adapters do
   * not republish a steady value, so on them this marks healthy data stale.
   */
  staleAfterMs?: number;
}

/** Symbol id (the element's data-symbol) to its binding. */
export type BindingMap = Record<string, SymbolBinding>;

export interface SymbolState {
  run?: RunState;
  value?: string;
  level?: number;
  position?: ValvePosition;
  mode?: Mode;
  flow?: Flow;
  quality: Quality;
  alarm: SymbolAlarm;
}

const RUN: RunState[] = ["stopped", "running", "starting", "stopping", "fault"];

/** true/1/"running" → running, false/0 → stopped; a RunState string passes through. */
export function defaultRun(v: unknown): RunState {
  if (typeof v === "string" && (RUN as string[]).includes(v)) return v as RunState;
  return v === true || (typeof v === "number" && v !== 0) || v === "1" || v === "true" ? "running" : "stopped";
}

/** true/1/"open" → open, false/0 → closed; "travel" passes through. */
export function defaultPosition(v: unknown): ValvePosition {
  if (v === "open" || v === "closed" || v === "travel") return v;
  return v === true || (typeof v === "number" && v !== 0) || v === "true" ? "open" : "closed";
}

export function defaultMode(v: unknown): Mode {
  return v === "manual" || v === "maintenance" ? v : "auto";
}

/** A positive number or true → forward, a negative number → reverse, else none. */
export function defaultFlow(v: unknown): Flow {
  if (v === "forward" || v === "reverse" || v === "none") return v;
  if (typeof v === "number") return v > 0 ? "forward" : v < 0 ? "reverse" : "none";
  return v === true || v === "true" ? "forward" : "none";
}

export function defaultFormat(v: unknown): string {
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(1);
  if (v === null || v === undefined) return "";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

const topicOf = (b: string | { topic: string }) => (typeof b === "string" ? b : b.topic);

/** Every topic a binding reads. */
export function topicsOf(binding: SymbolBinding): string[] {
  const parts = [binding.run, binding.value, binding.level, binding.position, binding.mode, binding.flow];
  return [...new Set(parts.filter((p) => p !== undefined).map((p) => topicOf(p!)))];
}

/**
 * Follows one symbol's topics, its source, the link and its alarms, and calls
 * `onState` with the whole state on every change. Returns a stop function.
 */
export function observeSymbol(
  binding: SymbolBinding,
  hub: TagHub,
  alarms: AlarmFeed | undefined,
  onState: (state: SymbolState) => void,
): () => void {
  const topics = topicsOf(binding);
  const readings = new Map<string, TagReading>();
  const state: SymbolState = { quality: "good", alarm: NO_ALARM };
  const started = Date.now();
  hub.watchSourceHealth();

  const quality = (): Quality => {
    if (!hub.connected || (binding.source && hub.sourceDown(binding.source))) return "comms-lost";
    if (topics.some((t) => hub.isFailing(t) || readings.get(t)?.quality === "bad")) return "bad";
    if (binding.staleAfterMs) {
      const now = Date.now();
      if (topics.some((t) => now - (readings.get(t)?.at ?? started) > binding.staleAfterMs!)) return "stale";
    }
    if (topics.some((t) => readings.get(t)?.quality === "uncertain")) return "uncertain";
    return "good";
  };

  let scheduled = false;
  const emit = () => {
    // Coalesce a burst (retained values on subscribe) into one update.
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      state.quality = quality();
      onState({ ...state });
    });
  };

  const stops: (() => void)[] = [];
  const on = <T>(b: Bound<T> | undefined, fallback: (v: unknown) => T, set: (v: T) => void) => {
    if (b === undefined) return;
    const topic = topicOf(b);
    const map = typeof b === "string" ? fallback : (b.map ?? fallback);
    stops.push(hub.watch(topic, (r) => {
      readings.set(topic, r);
      set(map(r.value));
      emit();
    }));
  };

  on(binding.run, defaultRun, (v) => (state.run = v));
  on(binding.position, defaultPosition, (v) => (state.position = v));
  on(binding.mode, defaultMode, (v) => (state.mode = v));
  on(binding.flow, defaultFlow, (v) => (state.flow = v));
  if (binding.value !== undefined) {
    const fmt = typeof binding.value === "string" ? defaultFormat : (binding.value.format ?? defaultFormat);
    on<string>(topicOf(binding.value), fmt, (v) => (state.value = v));
  }
  if (binding.level !== undefined) {
    const lv = binding.level;
    const min = typeof lv === "string" ? 0 : (lv.min ?? 0);
    const max = typeof lv === "string" ? 100 : (lv.max ?? 100);
    on<number>(topicOf(lv), (v) => Math.min(1, Math.max(0, (Number(v) - min) / (max - min || 1))), (v) => (state.level = v));
  }

  stops.push(hub.onConnection(emit));
  stops.push(hub.onHealth(emit));
  if (alarms) {
    const refresh = () => {
      state.alarm = summarise(alarms.rowsFor(topics, binding.alarmRules));
      emit();
    };
    refresh();
    stops.push(alarms.onChange(refresh));
  }
  if (binding.staleAfterMs) {
    const timer = setInterval(emit, Math.max(250, binding.staleAfterMs / 4));
    stops.push(() => clearInterval(timer));
  }
  emit();
  return () => stops.forEach((s) => s());
}

/**
 * Writes a state onto a symbol element as the symbol contract's attributes:
 * data-run, data-position, data-mode, data-flow, data-quality, data-alarm,
 * data-alarm-acked, data-alarm-active, data-alarm-shelved, --level, and the
 * text of [data-part="value"]. Attributes with no value are removed.
 */
export function applySymbolState(el: Element, s: SymbolState): void {
  const set = (name: string, v: string | undefined) => (v === undefined ? el.removeAttribute(name) : el.setAttribute(name, v));
  set("data-run", s.run);
  set("data-position", s.position);
  set("data-mode", s.mode);
  set("data-flow", s.flow);
  set("data-quality", s.quality);
  set("data-alarm", s.alarm.priority);
  set("data-alarm-acked", String(s.alarm.acked));
  set("data-alarm-active", String(s.alarm.active));
  set("data-alarm-shelved", s.alarm.shelved ? "true" : undefined);
  const style = (el as HTMLElement | SVGElement).style;
  if (s.level === undefined) style.removeProperty("--level");
  else style.setProperty("--level", s.level.toFixed(3));
  const value = el.querySelector('[data-part="value"]');
  if (value && s.value !== undefined) value.textContent = s.value;
}

/**
 * Binds every [data-symbol] element under `root` that the map names. Works
 * without a framework: an HTML Artifact, a plain page, or a framework
 * component's root element. Returns a stop function.
 */
export function bindScreen(root: ParentNode, map: BindingMap, hub: TagHub, alarms?: AlarmFeed): () => void {
  const stops: (() => void)[] = [];
  for (const [id, binding] of Object.entries(map)) {
    const el = root.querySelector(`[data-symbol="${CSS.escape(id)}"]`);
    if (!el) {
      console.warn(`bindScreen: no element with data-symbol="${id}"`);
      continue;
    }
    stops.push(observeSymbol(binding, hub, alarms, (s) => applySymbolState(el, s)));
  }
  return () => stops.forEach((s) => s());
}
