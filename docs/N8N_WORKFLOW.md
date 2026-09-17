# n8n Workflow: Upload & Wait

A ready-made n8n workflow that accepts an mp3 upload, calls the
[Kinetic Typography API](API.md), polls until the render finishes, and returns the
finished MP4 as the HTTP response — a single synchronous "upload and wait" call.

File: [`n8n/kinetic-render-workflow.json`](../n8n/kinetic-render-workflow.json)

## How it works

```
Upload Webhook -> Config -> Upload Audio (POST /render)
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

- **Upload Webhook** — receives the incoming `multipart/form-data` POST. The audio
  file must be sent as a field named `audio`; optional text fields `style`, `title`,
  `description`, `episodeLabel`, `languageCode` are forwarded to the API.
  `responseMode: responseNode` means n8n holds the original HTTP connection open
  until a "Respond to Webhook" node runs — that's what makes "upload and wait for
  the video" work as one request.
- **Config** — one place to set `apiBaseUrl` and `apiKey` (see [Setup](#setup)),
  plus the poll interval and a safety-net attempt cap.
- **Upload Audio** — `POST {apiBaseUrl}/render` with the audio forwarded as binary
  multipart data. Returns `{ jobId, statusUrl, downloadUrl }`.
- **Wait Before Check** → **Check Job Status** — polls `GET {apiBaseUrl}{statusUrl}`
  every `pollSeconds` (default 15s).
- **Job Status Router** — a Switch node with three outcomes:
  - `status == "completed"` → **Download Video** → **Return Video**
  - `status == "failed"`, or the status check itself errored, or `$runIndex` has
    exceeded `maxAttempts` → **Return Error** (`500` with the failure message)
  - anything else (`processing`) → loops back to **Wait Before Check**
- **Download Video** — `GET {apiBaseUrl}{downloadUrl}`, fetched as binary.
- **Return Video** — responds to the original caller with the MP4 as the response body.

## Setup

1. Import `n8n/kinetic-render-workflow.json` (n8n → Workflows → Import from File).
2. Open the **Config** node and set:
   - `apiBaseUrl` — where the API is reachable *from n8n*. If both run in the same
     Docker Compose project, use the service name (e.g. `http://kinetic-typography:4000`);
     otherwise `http://localhost:4000` or your real host.
   - `apiKey` — only if the API's `API_KEY` env var is set (see [API.md](API.md#authentication)).
3. Activate the workflow and copy the **Upload Webhook** node's Production URL.

## Calling it

```bash
curl -X POST <n8n-webhook-url> \
  -F "audio=@episode.mp3" \
  -F "style=focus-word" \
  -F "title=My Episode" \
  --output episode.mp4
```

The request doesn't return until the video is fully rendered — expect anywhere from
under a minute (short clips) to several minutes (long files, cold Chromium start).

## Timeouts you may need to raise

Because this holds one HTTP connection open for the full transcribe+render duration,
three independent timeouts all need to be longer than your longest expected render:

1. **n8n's own execution/webhook timeout** — set via the `EXECUTIONS_TIMEOUT` /
   `N8N_PAYLOAD_SIZE_MAX` environment variables (self-hosted n8n) — check your n8n
   version's docs for the current variable names, since they've moved over versions.
2. **Any reverse proxy in front of n8n** (e.g. NGINX Proxy Manager) — raise
   `proxy_read_timeout` / `proxy_send_timeout` for the n8n host.
3. **The calling client's own HTTP timeout** — e.g. `curl --max-time`, or your
   HTTP library's timeout option, if you're not calling this from `curl` directly.

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

## Alternative: fire-and-poll

If long-held connections are a problem in your setup, split this into two workflows
instead: one that calls `POST /render` and immediately returns `{ jobId }` to the
caller, and a second (webhook or scheduled) that the caller triggers separately to
check `GET /render/:jobId` and fetch `/download` once ready. The **Config**,
**Upload Audio**, **Download Video**, and **Return Video** nodes here can be reused
as-is in that split — only the polling loop and the "wait for it" framing change.

## Customizing

- **Different poll cadence**: edit `pollSeconds` in **Config**.
- **Extra config overrides** (e.g. `configOverrides` for a preset, `mode: "webhook"`):
  add a `formData` entry to **Upload Audio**'s body parameters the same way `style`/
  `title` are wired, sourced from `$json.body.<field>` in **Config**.
- **Cover image for vertical-show/orbit**: add a second file field (n8n's Webhook
  node exposes each uploaded file under its own field name) and forward it as a
  `formBinaryData` parameter named `cover` in **Upload Audio**, mirroring the `audio` one.
