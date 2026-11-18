# Where a SCADA screen can live

## Built-in dashboards

MACHHUB's dashboards already have live values, charts, alarm widgets and tables. If a screen needs only those, build it there: no code to maintain. Move to an app when it needs equipment graphics, a P&ID, faceplates or control.

## Hosted SDK app (main path)

A client-only SPA, uploaded with the Designer extension (Application Type SPA). It reads and writes through the SDK as the signed-in user. Everything in this skill applies. **v2:** a Workspace holds several apps, chosen with `?app=<id>` on upload; on v1 the app is `default`.

## v2 HTML Artifact (read-only mimic)

An HTML Artifact is a self-contained page MACHHUB shows in a sandboxed frame, for example in a dashboard's artifact widget. It suits a small read-only mimic beside other dashboard widgets.

What the sandbox allows:

- No network: no SDK, no MQTT, no fetch. Data comes only from the Artifact's own **bindings**, read with `await window.machhub.bind(name)` and resolved as the viewer, with the viewer's permissions.
- No writes of any kind: no control, no alarm acknowledgement.
- Inline script and CSS only; images as `data:` URLs. The HTML is at most 256 KB.
- A binding of `source: "tags"` lists up to 50 topics and answers their latest values; an Artifact has at most 20 bindings. A read is a snapshot, so the mimic polls (every 5 s by default); it is not live to the second, and it has no value quality or alarms.
- HTML a model wrote waits for a person with edit access to review it before its script runs.

Build one with the core: `createArtifactSdk({ binding: "plant" })` is an `HmiSdk` that polls the binding, so `TagHub` and `bindScreen` work unchanged and symbols show comms-lost when a read fails. [`../templates/artifact/`](../templates/artifact/) has a mimic (`mimic.html`, `mimic.ts`) and `build-artifact.mjs`, which bundles the script, inlines the CSS and symbols, checks the size and topic limits, and writes the `artifact/v1` JSON:

```bash
npm i -D esbuild
```

```bash
node build-artifact.mjs artifact.config.json
```

Create the Artifact with `POST /api/artifacts`, body `{ "folder": "<Explorer folder id>", "content": <that JSON> }`, or the `machhub.artifacts.create` MCP verb, then place it with a dashboard's artifact widget. The page that hosts the frame answers each `bind` with the binding's data (for `tags`, an array of `{ topic, value, ts }`) and allows 20 binds a second per frame; one poll of one binding every few seconds is far inside that.

Done when the JSON builds within the limits and the mimic, loaded with a stand-in `window.machhub.bind`, shows every bound state.
