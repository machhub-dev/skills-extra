import type { HmiSdk } from "./hmi-sdk";
import type { TagHub, TagReading } from "./hmi-tags";

export type WriteOutcome =
  | { status: "confirmed"; reading: TagReading }
  | { status: "failed"; reason: string }
  | { status: "refused"; reason: string };

export interface WriteRequest {
  /** The tag to write: a setpoint, a command, a mode. */
  topic: string;
  value: unknown;
  /**
   * Where the result is read back. Default: `topic`. Use the feedback tag
   * when a command has one (write Pump101/StartCmd, read back Pump101/Running).
   */
  readbackTopic?: string;
  /** The read-back value that means success. Default: the written value. */
  expect?: unknown;
  /** Default: strict equality, with numbers compared to 1e-6. */
  equals?: (readback: unknown, expected: unknown) => boolean;
  /** Default 5000 ms. */
  timeoutMs?: number;
  /** Default true for a setpoint. Use false for a one-shot command. */
  retain?: boolean;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-6;
  if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b);
  return a === b;
}

/**
 * Writes a value and waits until the plant reports it, so the screen never
 * shows a value the device has not taken.
 *
 * Refused, without writing, while the link is down or the read-back tag is
 * bad. When the read-back topic is the written topic, only a value an adapter
 * read counts (one that carries a quality): the broker echoes this client's
 * own publish at once, and that echo proves nothing.
 */
export async function writeAndConfirm(hub: TagHub, req: WriteRequest): Promise<WriteOutcome> {
  const readbackTopic = req.readbackTopic ?? req.topic;
  const expected = req.expect ?? req.value;
  const equals = req.equals ?? sameValue;
  const timeoutMs = req.timeoutMs ?? 5000;
  const sameTopic = readbackTopic === req.topic;

  if (!hub.connected) return { status: "refused", reason: "No connection to MACHHUB." };
  if (hub.isFailing(readbackTopic) || hub.last(readbackTopic)?.quality === "bad") {
    return { status: "refused", reason: "The device is not reporting this point." };
  }

  return new Promise<WriteOutcome>((resolve) => {
    let armed = false;
    let done = false;
    const finish = (o: WriteOutcome) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      stop();
      resolve(o);
    };
    const stop = hub.watch(readbackTopic, (r) => {
      if (!armed) return; // the value from before the write
      if (sameTopic && r.quality === undefined) return; // our own echo
      if (r.quality === "bad") return finish({ status: "failed", reason: "The device reported a bad value." });
      if (equals(r.value, expected)) finish({ status: "confirmed", reading: r });
    });
    const timer = setTimeout(() => finish({ status: "failed", reason: `No confirmation within ${timeoutMs / 1000} s.` }), timeoutMs);
    armed = true;
    hub.publish(req.topic, req.value, req.retain ?? true).catch((e: unknown) =>
      finish({ status: "failed", reason: e instanceof Error ? e.message : String(e) }),
    );
  });
}

/**
 * Whether the signed-in user may operate the plant from this app. `feature`
 * is one the app defines in MACHHUB's Permissions (machhub-permission-json)
 * and grants to operator groups at read-write. Fails closed.
 */
export async function canOperate(sdk: HmiSdk, feature = "scada_control", scope = "domain"): Promise<boolean> {
  if (!sdk.auth) return false;
  try {
    return (await sdk.auth.checkPermission(feature, "read-write", scope)).permission === true;
  } catch {
    return false;
  }
}
