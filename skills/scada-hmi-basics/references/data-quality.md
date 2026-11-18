# Data quality on a screen

MACHHUB publishes a tag's value bare, so every consumer can read it. What is known about the value travels beside it, and the HMI core reads all of it:

| Signal | Where it comes from | Read by |
|---|---|---|
| The app's link to MACHHUB | MQTT connect, offline and close events | `sdk.tag.onConnectionChange` → `TagHub.connected` |
| A value's quality | MQTT 5 user properties set by the adapter that read it: `mh-q` (good, uncertain, bad), `mh-src-ts` (device time), `mh-status` (OPC UA status) | The third argument of `sdk.tag.subscribe` → `TagReading.quality` |
| A data source's health | The retained topic `_MACHHUB/datasources/health/<workspace key>/<source id>`: `running`, `connected`, `failingPoints` (topics, at most 100 listed) | `TagHub.watchSourceHealth()` |

A failed read publishes nothing on the tag: the retained value stays, looking current. `failingPoints` is how a screen learns it has stopped being current, so bind `source` on every symbol whose data comes from a device.

A value a client published carries no quality: it is unknown, not good. The core treats unknown as good for display, and `writeAndConfirm` uses the difference to ignore its own echo.

## Why stale timers are off by default

MACHHUB adapters judge freshness by reads, not values: a point whose reads succeed is healthy however long its value stays the same, and a steady value is not republished. A client-side timer ("no new value for 10 s, so stale") would mark a healthy steady tank level stale. Set `staleAfterMs` only on a source you know publishes on every read (a script that republishes on a schedule), at about three times its period.

## What each state blocks

| Quality | Display | Motion | Control |
|---|---|---|---|
| `good` | Normal | Yes | Allowed |
| `uncertain` | Value italic with `?` | Yes | Allowed |
| `stale`, `bad` | Body dashed, value struck through | None | Refused |
| `comms-lost` | Whole symbol greyed | None | Refused |

Done right, an operator can tell from across the room which values are live, and never acts on one that is not.
