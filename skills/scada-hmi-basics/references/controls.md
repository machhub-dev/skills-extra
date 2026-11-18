# Operator control: the safe write pattern

A write from a screen moves a real valve or motor. Every control follows all six rules; the faceplate template (`Faceplate.svelte`) already does.

1. **Permission before the control is shown.** Define a feature for operating the plant (default name `scada_control`) in MACHHUB's Permissions page with `machhub-permission-json`, and grant it at read-write to operator groups only. `canOperate(sdk)` checks it once at start and fails closed. Without it the faceplate shows why, and no Start, Stop or Set.
2. **Select, then execute.** Clicking a symbol only selects it and opens its faceplate. The action asks for confirmation naming the object, the action and the value ("Set Speed to 1200 rpm?"). Nothing is written before Confirm. One object per action: no "start all" buttons on a screen.
3. **No optimistic UI.** After Confirm the faceplate shows "Sending…" until the plant reports the result (`writeAndConfirm`): the feedback tag for a command (`StartCmd` confirmed by `Running`), or the adapter's read-back for a setpoint. The broker echoes the app's own publish at once; `writeAndConfirm` ignores that echo, because it proves nothing. No confirmation within the timeout (default 5 s) is a failure, shown as such.
4. **Bad data blocks control.** No writes while the link is down, the point's source is down or failing, or the value is bad: the operator would be acting blind.
5. **Interlocks stay in the PLC.** The screen shows interlock and permissive states (bind them like any tag); it never decides whether an action is safe, and a range check on a setpoint input is for typing errors, not protection.
6. **v2: approval before a device write.** Where a site requires a second person to approve a write, do not publish it from the screen: make it a MACHHUB workflow, whose device-write steps wait for an approval unless the workflow holds an unattended-write grant, and have operators start and approve it there.

## Commands and setpoints

- A **command** (start, stop, open, reset) is written with `retain: false`, so it does not replay to the next subscriber, and confirmed on a separate feedback tag.
- A **setpoint** is written retained and confirmed on its read-back. If the adapter does not publish the read-back (it reports by exception and the value matches the last one it sent), confirm on a separate feedback tag instead; otherwise the write times out.
- **Mode** changes (auto, manual) are commands with their own feedback tag.

## Audit

MACHHUB journals alarm acknowledgements and shelving with the user. Tag writes from an app are not yet recorded per user by MACHHUB; where a site needs that record, write it to a collection (`machhub-sdk-collections`) after the device confirms: who, tag, old value, new value, time.
