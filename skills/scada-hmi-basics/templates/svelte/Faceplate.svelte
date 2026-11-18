<!--
  The faceplate: the one place an operator acts on a plant object. The symbol
  is selected first (on the screen), then the action is chosen here, then
  confirmed. A write shows "Sending" until the plant reports the new value
  (writeAndConfirm); it never shows the value before the device takes it.
-->
<script module lang="ts">
  /** What this object lets an operator do. Leave out what it does not have. */
  export interface Controls {
    /** Start and stop: command topic, values, and the feedback tag to confirm on. */
    run?: { command: string; start?: unknown; stop?: unknown; feedback: string; running?: unknown; stopped?: unknown; retain?: boolean };
    /** A setpoint: written and read back on the same topic unless `readback` names another. */
    setpoint?: { topic: string; readback?: string; min: number; max: number; step?: number; unit?: string; label?: string };
  }
</script>

<script lang="ts">
  import { writeAndConfirm, type SymbolState, type WriteOutcome } from "./core";
  import { useHmi } from "./hmi.svelte";

  interface Props {
    title: string;
    current?: SymbolState;
    controls?: Controls;
    onclose: () => void;
  }

  let { title, current, controls = {}, onclose }: Props = $props();
  const hmi = useHmi();

  type Pending = { label: string; run: () => Promise<WriteOutcome> };
  let confirm = $state<Pending | null>(null);
  let busy = $state(false);
  let result = $state<WriteOutcome | null>(null);
  let setpoint = $state<number | undefined>(undefined);
  let comment = $state("");

  const blocked = $derived(
    !hmi.canOperate ? "You do not have permission to operate." :
    current?.quality === "comms-lost" ? "No communication with this equipment." :
    current?.quality === "bad" ? "The device is not reporting; control is disabled." : null,
  );

  function ask(label: string, run: () => Promise<WriteOutcome>) {
    result = null;
    confirm = { label, run };
  }

  async function execute() {
    if (!confirm) return;
    busy = true;
    try {
      result = await confirm.run();
    } finally {
      busy = false;
      confirm = null;
    }
  }

  const run = controls.run;
  const start = () =>
    ask(`Start ${title}`, () => writeAndConfirm(hmi.hub, { topic: run!.command, value: run!.start ?? true, readbackTopic: run!.feedback, expect: run!.running ?? true, retain: run!.retain ?? false }));
  const stop = () =>
    ask(`Stop ${title}`, () => writeAndConfirm(hmi.hub, { topic: run!.command, value: run!.stop ?? false, readbackTopic: run!.feedback, expect: run!.stopped ?? false, retain: run!.retain ?? false }));

  const sp = controls.setpoint;
  const spValid = $derived(setpoint !== undefined && sp !== undefined && setpoint >= sp.min && setpoint <= sp.max);
  const writeSetpoint = () =>
    ask(`Set ${sp!.label ?? "setpoint"} to ${setpoint} ${sp!.unit ?? ""}`.trim(), () =>
      writeAndConfirm(hmi.hub, { topic: sp!.topic, value: setpoint, readbackTopic: sp!.readback }),
    );

  const ackable = $derived(current && current.alarm.priority !== "none" && !current.alarm.acked);
  async function ack() {
    if (!current) return;
    await hmi.alarms.ack(current.alarm.ruleIds, comment || undefined);
    comment = "";
  }
</script>

<div class="faceplate" role="dialog" aria-label="{title} faceplate" data-faceplate>
  <header>
    <h2>{title}</h2>
    <button type="button" class="close" onclick={onclose} aria-label="Close">×</button>
  </header>

  <dl>
    {#if current?.run}<dt>State</dt><dd data-field="run">{current.run}</dd>{/if}
    {#if current?.position}<dt>Position</dt><dd>{current.position}</dd>{/if}
    {#if current?.mode}<dt>Mode</dt><dd>{current.mode}</dd>{/if}
    {#if current?.value !== undefined}<dt>Value</dt><dd>{current.value}</dd>{/if}
    <dt>Data</dt><dd data-field="quality">{current?.quality ?? "–"}</dd>
    {#if current && current.alarm.priority !== "none"}
      <dt>Alarm</dt><dd data-field="alarm">{current.alarm.priority}{current.alarm.acked ? "" : ", unacknowledged"}</dd>
    {/if}
  </dl>

  {#if ackable}
    <div class="row">
      <input class="comment" placeholder="Comment (optional)" bind:value={comment} maxlength="500" />
      <button type="button" onclick={ack} data-action="ack">Acknowledge</button>
    </div>
  {/if}

  {#if run || sp}
    {#if blocked}
      <p class="blocked" data-blocked>{blocked}</p>
    {:else if confirm}
      <div class="confirm" data-confirm>
        <p>{confirm.label}?</p>
        <button type="button" class="primary" onclick={execute} disabled={busy} data-action="execute">Confirm</button>
        <button type="button" onclick={() => (confirm = null)} disabled={busy}>Cancel</button>
      </div>
    {:else}
      {#if run}
        <div class="row">
          <button type="button" onclick={start} disabled={busy || current?.run === "running"} data-action="start">Start</button>
          <button type="button" onclick={stop} disabled={busy || current?.run === "stopped"} data-action="stop">Stop</button>
        </div>
      {/if}
      {#if sp}
        <div class="row">
          <label>
            {sp.label ?? "Setpoint"}
            <input type="number" min={sp.min} max={sp.max} step={sp.step ?? "any"} bind:value={setpoint} data-input="setpoint" />
            {sp.unit ?? ""}
          </label>
          <button type="button" onclick={writeSetpoint} disabled={busy || !spValid} data-action="setpoint">Set</button>
        </div>
        <p class="hint">Range {sp.min} to {sp.max} {sp.unit ?? ""}</p>
      {/if}
    {/if}
    {#if busy}<p data-status="pending">Sending…</p>{/if}
    {#if result}
      <p data-status={result.status} class:failed={result.status !== "confirmed"}>
        {result.status === "confirmed" ? "Confirmed by the device." : result.reason}
      </p>
    {/if}
  {/if}
</div>

<style>
  .faceplate {
    min-width: 260px;
    padding: 12px 14px;
    border: 1px solid var(--hmi-line);
    background: var(--hmi-panel);
    color: var(--hmi-fg);
    font-size: 13px;
  }
  header { display: flex; justify-content: space-between; align-items: center; }
  h2 { margin: 0; font-size: 15px; }
  .close { border: 0; background: none; font-size: 18px; cursor: pointer; color: inherit; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 10px 0; }
  dt { color: var(--hmi-muted); }
  dd { margin: 0; font-variant-numeric: tabular-nums; }
  .row { display: flex; gap: 8px; align-items: center; margin: 8px 0; }
  button { padding: 4px 10px; border: 1px solid var(--hmi-line); background: var(--hmi-bg); color: inherit; font: inherit; cursor: pointer; }
  button:disabled { opacity: 0.5; cursor: default; }
  .primary { border-color: var(--hmi-fg); font-weight: 600; }
  input { width: 90px; padding: 3px 6px; font: inherit; }
  input.comment { flex: 1; width: auto; min-width: 0; }
  .confirm { padding: 8px; border: 1px dashed var(--hmi-fg); }
  .confirm p { margin: 0 0 6px; font-weight: 600; }
  .blocked, .failed { color: var(--hmi-bad); }
  .hint { margin: 0; color: var(--hmi-muted); font-size: 11px; }
</style>
