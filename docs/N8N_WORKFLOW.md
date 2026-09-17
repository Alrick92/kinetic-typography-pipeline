# n8n Workflow: Upload & Wait (Web Form)

A ready-made n8n workflow with a web form: upload an audio file, pick style/
background/language from real dropdowns, and get the finished MP4 back once
rendering completes — a single synchronous "upload and wait" interaction.

File: [`n8n/kinetic-render-workflow.json`](../n8n/kinetic-render-workflow.json)

## How it works

```
Kinetic Render Form -> Read Form Fields -> Config -> Upload Audio (POST /render)
                                                            |
                                                            v
                                                    Wait Before Check <---------+
                                                            |                    |
                                                            v                    |
                                                    Check Job Status             |
                                                            |                    |
                                                            v                    |
                                                    Job Status Router            |
                                                 completed / failed / processing-+
                                                  |            |
                                                  v            v
                                           Download Video   Return Error
                                                  |
                                                  v
                                            Return Video
```

- **Kinetic Render Form** — an n8n **Form Trigger** (not a plain JSON webhook).
  Fields: **Audio File** (upload), and real dropdowns for **Style**,
  **Background Type**, and **Language Code**, plus optional text fields **Title**,
  **Description**, **Episode Label** (only read by `vertical-show`/`orbit`).
  `responseMode: responseNode` holds the page open until a "Respond to Webhook"
  node runs — that's what makes "submit and wait for the video" work as one request.
- **Read Form Fields** — maps the form's labeled answers (`$json['Style']`, etc.)
  to the plain field names the rest of the workflow uses.
- **Config** — infrastructure settings only: `apiBaseUrl`, `apiKey`, the poll
  interval, and a safety-net attempt cap. Not user-facing — set once by whoever
  installs this workflow.
- **Upload Audio** — `POST {apiBaseUrl}/render` with the audio forwarded as binary
  multipart data (the binary property name is resolved dynamically via
  `Object.keys($binary)[0]`, so it doesn't matter what n8n internally calls the
  form's uploaded file), plus the chosen style/background/etc. as form fields.
  `backgroundType` goes through as a `configOverrides` JSON blob since the API's
  shorthand fields don't include it directly. Returns `{ jobId, statusUrl, downloadUrl }`.
- **Wait Before Check** → **Check Job Status** — polls `GET {apiBaseUrl}{statusUrl}`
  every `pollSeconds` (default 15s).
- **Job Status Router** — a Switch node with three outcomes:
  - `status == "completed"` → **Download Video** → **Return Video**
  - `status == "failed"`, the status check itself errored, or `$runIndex` has
    exceeded `maxAttempts` → **Return Error** (`500` with the failure message)
  - anything else (`processing`) → loops back to **Wait Before Check**
- **Download Video** — `GET {apiBaseUrl}{downloadUrl}`, fetched as binary.
- **Return Video** — responds with the MP4 as the response body. The API names it
  after the original upload (`episode.mp3` → `episode.mp4`) automatically — nothing
  to configure for that.

## Setup

1. Import `n8n/kinetic-render-workflow.json` (n8n → Workflows → Import from File).
2. Open **Config** and set:
   - `apiBaseUrl` — where the API is reachable *from n8n*. Same Docker Compose
     project → use the service name (e.g. `http://kinetic-typography:4000`);
     otherwise `http://localhost:4000` or your real host.
   - `apiKey` — only if the API's `API_KEY` env var is set (see [API.md](API.md#authentication)).
3. Activate the workflow, open the **Kinetic Render Form** node, and copy its
   Production URL.

## Using it

Open the form URL in a browser: upload an audio file, pick **Style**,
**Background Type**, and **Language Code** from the dropdowns, optionally fill in
**Title**/**Description**/**Episode Label**, and submit. The page won't respond
until the video is fully rendered — expect anywhere from under a minute (short
clips) to several minutes (long files, cold Chromium start) — then the MP4 downloads.

n8n Form Trigger endpoints also accept a plain programmatic `multipart/form-data`
POST (same field names as the form labels: `Audio File`, `Style`, `Background Type`,
`Language Code`, `Title`, `Description`, `Episode Label`), if you want to call this
from a script instead of a browser.

## Timeouts you may need to raise

Because this holds one HTTP connection open for the full transcribe+render duration,
three independent timeouts all need to be longer than your longest expected render:

1. **n8n's own execution/webhook timeout** — set via the `EXECUTIONS_TIMEOUT` /
   `N8N_PAYLOAD_SIZE_MAX` environment variables (self-hosted n8n) — check your n8n
   version's docs for the current variable names, since they've moved over versions.
2. **Any reverse proxy in front of n8n** (e.g. NGINX Proxy Manager) — raise
   `proxy_read_timeout` / `proxy_send_timeout` for the n8n host.
3. **The browser's own request timeout** (usually generous, but corporate proxies
   in between can cut long-idle connections) — or your script's HTTP client timeout
   if calling this programmatically.

If you'd rather not hold connections open for minutes at a time, see
[Alternative: fire-and-poll](#alternative-fire-and-poll) below.

## Safety net for a lost job

The API's job registry is in-memory (see [API.md](API.md#limits--operational-notes)) —
if the API process restarts mid-poll, `GET /render/:jobId` starts returning `404`.
**Check Job Status** has `onError: continueRegularOutput` set so a `404` doesn't
crash the workflow; combined with the `$runIndex >= maxAttempts` check in **Job
Status Router**, the workflow gives up cleanly (with a `500` error response) instead
of polling forever. Default `maxAttempts: 80` at `pollSeconds: 15` caps a stuck loop
at ~20 minutes, comfortably above the API's own 10-minute UniScribe poll timeout —
so in the normal case, the API itself reports `"failed"` well before this kicks in.

## A note on how this was built

I authored this workflow's JSON by hand rather than exporting it from a running
n8n instance, since I don't have one to test against here. The overall structure,
node wiring, and expressions are correct n8n patterns, but two specific details are
best-effort and worth a quick look after you import:

- **Form Trigger's file-field binary property name**: I made **Upload Audio**
  resolve it dynamically (`Object.keys($binary)[0]`) specifically to avoid needing
  to guess this — it should work regardless of what n8n calls it internally, as
  long as the form submission has exactly one uploaded file (true here).
- **Form Trigger's `responseMode: "responseNode"` support**: documented n8n
  behavior mirrors the plain Webhook node's response modes, but if your n8n version
  handles this differently, the fix is limited to that one node's `options` — the
  rest of the workflow (the polling loop, error handling) doesn't change.

If either shows an import warning or doesn't behave as described, tell me what n8n
shows and I'll adjust.

## Alternative: fire-and-poll

If long-held connections are a problem in your setup, split this into two workflows
instead: one that calls `POST /render` and immediately returns `{ jobId }`, and a
second that the caller triggers separately to check `GET /render/:jobId` and fetch
`/download` once ready. **Config**, **Upload Audio**, **Download Video**, and
**Return Video** can be reused as-is in that split — only the polling loop and the
"wait for it" framing change.

## Customizing

- **Different poll cadence**: edit `pollSeconds` in **Config**.
- **More/fewer dropdown choices**: edit the **Kinetic Render Form** node's field
  definitions directly — each dropdown's options are a plain list you can add to or
  trim (e.g. more language codes; UniScribe supports 63).
- **A plain audio-only webhook instead of a form** (fixed options, no per-request
  choices): swap **Kinetic Render Form** back for a `n8n-nodes-base.webhook` node
  and hardcode `style`/`backgroundType`/etc. as fixed values in **Config** — this is
  what an earlier version of this workflow did; ask if you want that variant instead
  or alongside this one.
- **Extra config overrides** (e.g. selecting a config preset file, `mode: "webhook"`):
  add another `formData` entry to **Upload Audio**'s body parameters, sourced from
  a new field on the form (or a fixed value in **Config**).
- **Cover image for vertical-show/orbit**: add a second file field to the form and
  forward it as a `formBinaryData` parameter named `cover` in **Upload Audio**,
  mirroring the audio one (resolve its binary key the same dynamic way).
