import type { HmiSdk, TagMessageMeta } from "./hmi-sdk";

/**
 * An HmiSdk for a MACHHUB 2 HTML Artifact. The Artifact's sandbox has no
 * network: data comes only from window.machhub.bind(name), which resolves one
 * of the Artifact's own bindings (artifact/v1) as the viewer. So this polls a
 * "tags" binding and delivers each topic's latest value; it cannot write.
 *
 *   const sdk = createArtifactSdk({ binding: "plant", intervalMs: 5000 });
 *   const hub = new TagHub(sdk);
 *   bindScreen(document, bindings, hub);
 *
 * Every topic the screen binds must be listed in that binding's `topics`
 * (at most 50 per binding). A failed read reports the link as down, so
 * symbols show comms-lost until the next read succeeds.
 */
export function createArtifactSdk(options: { binding: string; intervalMs?: number }): HmiSdk {
  const bridge = (globalThis as { machhub?: { bind(name: string): Promise<unknown> } }).machhub;
  if (!bridge) throw new Error("window.machhub.bind is missing: this page is not running as a MACHHUB HTML Artifact.");

  const handlers = new Map<string, (value: unknown, topic?: string, meta?: TagMessageMeta) => void>();
  const linkListeners = new Set<(up: boolean) => void>();
  const last = new Map<string, string>();
  let connected = true;
  let polling = false;

  const setLink = (up: boolean) => {
    if (up === connected) return;
    connected = up;
    for (const l of linkListeners) l(up);
  };

  // A resolve answers the readings, or an envelope holding them in `data`.
  const readings = (res: unknown): { topic: string; value: unknown; ts?: string | null }[] => {
    const rows = Array.isArray(res) ? res : (res as { data?: unknown })?.data;
    return Array.isArray(rows) ? rows : [];
  };

  const poll = async () => {
    try {
      for (const r of readings(await bridge.bind(options.binding))) {
        const handler = handlers.get(r.topic);
        const key = JSON.stringify([r.value, r.ts ?? null]);
        if (!handler || last.get(r.topic) === key) continue; // unwatched, or unchanged since the last read
        last.set(r.topic, key);
        handler(r.value, r.topic, { sourceTime: r.ts ?? undefined, retained: false });
      }
      setLink(true);
    } catch {
      setLink(false);
    }
    setTimeout(poll, Math.max(1000, options.intervalMs ?? 5000));
  };

  return {
    tag: {
      async subscribe(topic, callback) {
        handlers.set(topic, callback);
        if (!polling) {
          polling = true;
          void poll();
        }
      },
      async unsubscribe(topic) {
        handlers.delete(topic);
        last.delete(topic);
      },
      async publish() {
        throw new Error("An HTML Artifact is read-only: it cannot write to the plant.");
      },
      onConnectionChange(listener) {
        linkListeners.add(listener);
        listener(connected);
        return () => linkListeners.delete(listener);
      },
    },
  };
}
