<!--
  The alarm banner, on every screen: counts by priority, the newest alarm that
  needs attention, and a link to the alarm list. The link-lost line shows here
  too, because it is the one fact that makes every value on the screen suspect.
-->
<script lang="ts">
  import { ruleKey, type AlarmLiveRow, type AlarmPriority } from "./core";
  import { useHmi } from "./hmi.svelte";

  interface Props {
    /** Where the full alarm list lives (MACHHUB's Alarms page or the app's own). */
    listHref?: string;
  }

  let { listHref = "/alarms" }: Props = $props();
  const hmi = useHmi();
  let rows = $state<AlarmLiveRow[]>([]);

  $effect(() => {
    if (!hmi.alarms) return;
    rows = hmi.alarms.all();
    return hmi.alarms.onChange(() => (rows = hmi.alarms.all()));
  });

  const ORDER: AlarmPriority[] = ["critical", "high", "medium", "low"];
  const attention = $derived(rows.filter((r) => r.state && ["unack", "ack", "cleared"].includes(r.state.state)));
  const counts = $derived(ORDER.map((p) => ({ p, n: attention.filter((r) => r.rule.priority === p).length })));
  const newest = $derived(
    attention
      .filter((r) => r.state?.state !== "ack")
      .sort((a, b) => ORDER.indexOf(a.rule.priority) - ORDER.indexOf(b.rule.priority) || (b.state?.activeSince ?? "").localeCompare(a.state?.activeSince ?? ""))[0],
  );
</script>

<div class="banner" data-alarm-banner>
  {#if !hmi.connected}
    <strong class="link" data-link-lost>No connection to MACHHUB. Values are not live.</strong>
  {/if}
  <span class="counts">
    {#each counts as c (c.p)}
      <span class="count" data-priority={c.p} data-count={c.n} class:zero={c.n === 0}>{c.n}</span>
    {/each}
  </span>
  {#if newest}
    <span class="newest" data-newest={ruleKey(newest.rule)}>
      {newest.rule.name}{newest.rule.message ? `: ${newest.rule.message}` : ""}
    </span>
  {:else if hmi.alarms && !hmi.alarms.available}
    <span class="newest muted">Alarms need a newer MACHHUB SDK.</span>
  {:else}
    <span class="newest muted">No alarms need attention</span>
  {/if}
  <a href={listHref}>Alarms</a>
</div>

<style>
  .banner {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 6px 12px;
    background: var(--hmi-panel);
    border-bottom: 1px solid var(--hmi-line);
    font-size: 13px;
  }
  .link { color: var(--hmi-bad); }
  .counts { display: flex; gap: 4px; }
  .count {
    min-width: 22px;
    padding: 0 4px;
    text-align: center;
    font-weight: 700;
    color: var(--hmi-alarm-ink);
  }
  .count[data-priority="critical"] { background: var(--hmi-alarm-critical); }
  .count[data-priority="high"] { background: var(--hmi-alarm-high); }
  .count[data-priority="medium"] { background: var(--hmi-alarm-medium); }
  .count[data-priority="low"] { background: var(--hmi-alarm-low); }
  .count.zero { background: none; color: var(--hmi-muted); outline: 1px solid var(--hmi-line); }
  .newest { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .muted { color: var(--hmi-muted); }
  a { color: inherit; }
</style>
