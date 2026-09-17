# Kinetic Typography API Reference

HTTP API for the audio-to-kinetic-typography pipeline. Start it with `npm run webhook`
(or via Docker — see the main [README](../README.md#docker)). Default base URL:
`http://localhost:4000`.

This is the same server the README calls "the webhook server" (it's what n8n talks
to) — this document is the full reference for every endpoint on it, including the
direct-upload flow that has nothing to do with n8n.

## Contents

- [Authentication](#authentication)
- [Quick start](#quick-start)
- [Endpoints](#endpoints)
  - [GET /health](#get-health)
  - [GET /styles](#get-styles)
  - [GET /queue](#get-queue)
  - [POST /render](#post-render)
  - [GET /render/:jobId](#get-renderjobid)
  - [GET /render/:jobId/download](#get-renderjobiddownload)
  - [POST /uniscribe/webhook](#post-uniscribewebhook-internal)
- [Job lifecycle](#job-lifecycle)
- [Reveal styles &amp; show metadata](#reveal-styles--show-metadata)
- [Error format](#error-format)
- [Limits &amp; operational notes](#limits--operational-notes)

## Authentication

Every endpoint except `GET /health` optionally requires an API key, controlled by
the `API_KEY` environment variable:

- **`API_KEY` unset** (default): the API is open. Fine when the server is only
  reachable on a private network (e.g. Docker network, localhost, VPN).
- **`API_KEY` set**: every request (except `/health`) must send it back via header:

  ```
  X-API-Key: <your API_KEY value>
  ```

  A missing or mismatched key returns `401 { "error": "Missing or invalid X-API-Key header" }`.

Set `API_KEY` before exposing this server to the internet (e.g. behind NGINX Proxy
Manager) — see [.env.example](../.env.example).

## Quick start

Render a video by uploading a file directly — no shared filesystem or n8n required:

```bash
curl -X POST http://localhost:4000/render \
  -H "X-API-Key: $API_KEY" \
  -F "audio=@episode.mp3" \
  -F "style=focus-word"
# -> {"jobId":"...", "statusUrl":"/render/...", "downloadUrl":"/render/.../download"}

curl http://localhost:4000/render/<jobId>          # poll until status is "completed"
curl -OJ http://localhost:4000/render/<jobId>/download   # save the finished MP4
```

## Endpoints

### `GET /health`

Liveness check. Never requires auth.

**Response `200`**
```json
{ "status": "ok", "uptimeSec": 1234 }
```

### `GET /styles`

Lists every reveal style and background type, for building a style picker without
hardcoding the list client-side.

**Response `200`**
```json
{
  "revealStyles": [
    { "id": "word-pop", "label": "Word Pop", "description": "...", "requiresShowMetadata": false },
    { "id": "orbit", "label": "Orbit", "description": "...", "requiresShowMetadata": true }
  ],
  "backgroundTypes": [
    { "id": "solid", "label": "Solid color", "description": "..." }
  ]
}
```
`requiresShowMetadata: true` marks styles (`vertical-show`, `orbit`) that read the
`show.*` fields described [below](#reveal-styles--show-metadata).

### `GET /queue`

Current render-queue state — how many renders are actively running vs. waiting.

**Response `200`**
```json
{ "running": 1, "waiting": 2, "maxConcurrentRenders": 1 }
```

### `POST /render`

Starts a render job and returns immediately (`202`) with a job id to poll. Accepts
**either** a direct file upload **or** a server-side path — pick one per request.

#### Mode A — direct upload (`multipart/form-data`)

Use this from any HTTP client that isn't sharing a filesystem with the server.

| Field | Type | Required | Description |
|---|---|---|---|
| `audio` | file | **yes*** | The audio/video file to transcribe and render. |
| `cover` | file | no | Cover/avatar image for `vertical-show` / `orbit` (equivalent to `show.coverImagePath`). |
| `languageCode` | text | no | UniScribe language code, default `en`. |
| `outputFileName` | text | no | Output MP4 filename. Defaults to the **original uploaded filename** with its extension swapped to `.mp4` (e.g. `episode.mp3` → `episode.mp4`) — not the randomized name the file is stored under on disk. |
| `style` | text | no | Shorthand for `reveal.style` (see [styles](#reveal-styles--show-metadata)). |
| `title` | text | no | Shorthand for `show.title`. |
| `description` | text | no | Shorthand for `show.description`. |
| `episodeLabel` | text | no | Shorthand for `show.episodeLabel`. |
| `configPath` | text | no | Server-side path to a YAML/JSON config preset, e.g. `config/presets/lime-show.yaml`. |
| `configOverrides` | text (JSON string) | no | Freeform config override, deep-merged last (wins over the shorthand fields above). |
| `mode` | text | no | `"poll"` (default) or `"webhook"` — see [job lifecycle](#job-lifecycle). |

\* either `audio` (this mode) or `audioFilePath` (mode B) is required.

```bash
curl -X POST http://localhost:4000/render \
  -F "audio=@episode.mp3" \
  -F "cover=@cover.jpg" \
  -F "style=orbit" \
  -F "title=Sarah Connor" \
  -F "description=On Building Calm Software" \
  -F "episodeLabel=EP. 12" \
  -F 'configOverrides={"output":{"orientation":"horizontal"}}'
```

#### Mode B — server-side path (`application/json`)

Use this when the caller and the API server share a filesystem (e.g. n8n and this
container mounting the same `./data` volume — see the
[n8n section of the README](../README.md#n8n--webhook-usage)).

| Field | Type | Required | Description |
|---|---|---|---|
| `audioFilePath` | string | **yes*** | Path to the audio file, resolved on the **server's** filesystem. |
| `coverImagePath` | string | no | Path to a cover image, resolved on the **server's** filesystem. |
| everything else | — | no | Same fields as Mode A (`languageCode`, `outputFileName`, `style`, `title`, `description`, `episodeLabel`, `configPath`, `configOverrides`, `mode`), sent as ordinary JSON values (`configOverrides` may be a JSON object here, not a string). |

```bash
curl -X POST http://localhost:4000/render \
  -H "Content-Type: application/json" \
  -d '{
    "audioFilePath": "/app/data/episode.mp3",
    "languageCode": "en",
    "outputFileName": "episode-final.mp4",
    "configOverrides": { "reveal": { "style": "karaoke" } },
    "mode": "poll"
  }'
```

**Response `202`**
```json
{
  "jobId": "035a4abc-cc57-4d3c-8ba6-b83c87cdd994",
  "statusUrl": "/render/035a4abc-cc57-4d3c-8ba6-b83c87cdd994",
  "downloadUrl": "/render/035a4abc-cc57-4d3c-8ba6-b83c87cdd994/download"
}
```

**Errors** — `400` for a missing/nonexistent audio source, invalid `configOverrides`
JSON, invalid config values, or (Mode B webhook mode) a missing `PUBLIC_BASE_URL`.

### `GET /render/:jobId`

Poll this until `status` is `completed` or `failed`.

**Response `200`**
```json
{ "status": "queued", "queuePosition": 2, "createdAt": "2026-01-15T10:30:00.000Z", "updatedAt": "2026-01-15T10:30:00.000Z" }
```
```json
{ "status": "processing", "createdAt": "2026-01-15T10:30:00.000Z", "updatedAt": "2026-01-15T10:30:05.000Z" }
```
```json
{ "status": "completed", "outputPath": "/app/output/episode.mp4", "createdAt": "...", "updatedAt": "..." }
```
```json
{ "status": "failed", "error": "UniScribe API key is invalid or missing. ...", "createdAt": "...", "updatedAt": "..." }
```

`queued` means the job is waiting for a render slot (see [Queueing](#queueing)) —
`queuePosition` is its 1-based place in that line, and only appears while queued.
`processing` covers everything actively happening: contacting UniScribe, waiting
for transcription, and the render itself.

`404` if the job id is unknown (never existed, or the server restarted — see
[operational notes](#limits--operational-notes)).

### `GET /render/:jobId/download`

Streams the finished MP4 (`Content-Type: video/mp4`, as an attachment).

- `404` — unknown job id.
- `409` — job exists but isn't completed yet (`{ "error": "job is queued, not ready for download" }` or `"job is processing, ..."`).
- `410` — job completed but the output file has since been deleted from disk.

### `POST /uniscribe/webhook` (internal)

UniScribe calls this back when a transcription finishes, if you started the job
with `mode: "webhook"`. You should never call this yourself — it's documented here
only so the request shape isn't a mystery in logs. Always responds `200` immediately
(UniScribe requires a 2xx ack within 30s) and does the real work asynchronously.

## Queueing

Every render (transcription-wait + the actual headless-Chrome render) goes through
a FIFO queue capped by `MAX_CONCURRENT_RENDERS` (default `1`) — see
[.env.example](../.env.example). Extra requests beyond that limit sit as `status:
"queued"` until a slot frees up, rather than all running at once. This exists
because each render is CPU/RAM-heavy; letting a burst of requests spawn that many
concurrent Chromium instances on a modest VPS would starve all of them rather than
speed anything up. Raise `MAX_CONCURRENT_RENDERS` only if you've confirmed the host
can handle that many concurrent renders without degrading each one.

For `mode: "webhook"` jobs specifically, only the actual render step (once
UniScribe's callback arrives) goes through this queue — the initial upload and
transcription request to UniScribe happens immediately, since that step is
network-bound rather than CPU-heavy and delaying it would just slow down
transcription for no benefit.

Check `GET /queue` for current queue depth, or a job's own `queuePosition` field
while it's `queued`.

## Job lifecycle

Every job starts `processing` (or `queued`, once it reaches the render step — see
[Queueing](#queueing)) and ends at `completed` or `failed`. Internally there
are two ways a job gets from start to finish, chosen by `mode`:

- **`mode: "poll"`** (default): the server itself polls UniScribe's status endpoint
  (every `uniscribe.pollIntervalMs`, default 45s) until the transcription finishes,
  then renders. No public URL needed — this is the simplest mode and what you want
  unless this server already has a public URL.
- **`mode: "webhook"`**: requires `PUBLIC_BASE_URL` to be set and reachable from the
  internet. Instead of polling, UniScribe calls `POST {PUBLIC_BASE_URL}/uniscribe/webhook`
  when done, which resumes the job. Saves the poll delay; needs public ingress
  (e.g. NGINX Proxy Manager) pointed at this container.

A cache-hit (the exact same audio file was rendered before) skips UniScribe
entirely in both modes and jumps straight to rendering — see
[Idempotency](../README.md) in the README.

## Reveal styles & show metadata

Full descriptions are in [`GET /styles`](#get-styles) and the
[README's Reveal styles section](../README.md#reveal-styles). Summary:

| Style | Needs `show.*`? |
|---|---|
| `word-pop`, `karaoke`, `focus-word`, `clean-feed` | No |
| `vertical-show`, `orbit` | Yes — `title` (falls back to filename), `coverImagePath` (falls back to a placeholder circle), `description`, `episodeLabel`; `orbit` also uses `totalChapters` for its dot indicator (config-only, not a request field). |

`vertical-show` and `orbit` render their own waveform/spectrum visualization — set
`background.type` to `solid` or `gradient` for these, not `waveform` (see the ready-made
[`config/presets/lime-show.yaml`](../config/presets/lime-show.yaml)).

## Error format

Request-validation errors (`400`/`401`/`404`/`409`/`410`) are always:
```json
{ "error": "human-readable message" }
```

Pipeline failures surface through job status (`GET /render/:jobId` → `status: "failed"`,
`error: "..."`), not as an HTTP error response, since the failure happens after the
`202` has already been returned. The message text identifies the failing stage —
see the exit-code table in the [README](../README.md#cli-usage) for the full list
(invalid API key, plan-tier access denied, rate limit, unsupported format, empty/failed
transcript, render crash).

## Limits & operational notes

- **Upload size**: 2GB per file (`audio` or `cover`), enforced by the server.
- **Job storage is in-memory.** Jobs (and the UniScribe-webhook waiting list) live
  only in the running process — a server restart loses in-flight job status (the
  render itself, if already completed, is untouched on disk; only the job's
  `GET /render/:jobId` record disappears). Re-submit if you get a `404` for a job
  you're sure you created before a restart. The transcript cache (keyed by audio
  file hash) means a re-submit of the same file won't re-bill UniScribe.
- **Uploaded files** land in `data/uploads/` (gitignored) and are never
  automatically deleted — clean that directory periodically if disk space matters.
- **No built-in rate limiting.** This is a personal-automation tool, not a
  multi-tenant SaaS; if you expose it publicly, put a reverse-proxy rate limit in
  front of it in addition to setting `API_KEY`.
