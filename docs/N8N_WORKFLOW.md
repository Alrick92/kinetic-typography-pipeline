# n8n Workflow: Upload & Wait (Web Form)

A ready-made n8n workflow with a web form: upload an audio file (and optionally a
cover image), pick one of the four styles, set the background/font/highlight colors,
and get the finished MP4 back once rendering completes — a single synchronous
"upload and wait" interaction.

File: [`n8n/kinetic-render-workflow.json`](../n8n/kinetic-render-workflow.json)

## How it works

```
Kinetic Render Form -> Read Form Fields -> Config -> Has Cover Image?
                                                      yes |            | no
                                                          v            v
                                        Upload Audio + Cover      Upload Audio   (POST /render)
                                                          \            /
                                                           Render Job
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
  Fields, in order:
  - **Audio File** (upload, required)
  - **Style** (dropdown, required) — exactly the four styles: `focus-word`,
    `clean-feed`, `vertical-show`, `orbit`
  - **Cover Image** (upload, optional — `.jpg`/`.png`/`.webp`) — the circular photo
    shown by `vertical-show`/`orbit`; without one they show a placeholder circle in
    the highlight color
  - **Background Color** (optional) — a preset name (White/Black/Grey/Silver/Blue) or
    any hex like `#1E88E5`
  - **Font Color** / **Highlight Color** (optional) — hex text and active-word colors
  - **Title**, **Description**, **Episode Label** (optional, only read by
    `vertical-show`/`orbit`)
  - **Language Code** (dropdown, required) — the transcription language

  Blank optional fields keep the config default. `responseMode: responseNode` holds
  the page open until a "Respond to Webhook" node runs — that's what makes "submit
  and wait for the video" work as one request.
- **Read Form Fields** — maps the form's labeled answers (`$json['Style']`, etc.)
  to the plain field names the rest of the workflow uses.
- **Config** — infrastructure settings only: `apiBaseUrl`, `apiKey`, the poll
  interval, and a safety-net attempt cap. Not user-facing — set once by whoever
  installs this workflow.
- **Has Cover Image?** — an IF node: true when the submission carries a second
  uploaded file. The two branches differ only in whether a `cover` file is sent,
  because an HTTP Request node errors on a binary field that doesn't exist.
- **Upload Audio** / **Upload Audio + Cover** — `POST {apiBaseUrl}/render` with the
  audio (and cover) forwarded as binary multipart data, plus the chosen style/colors/
  etc. as form fields. The binary property names are resolved dynamically (the key
  containing "audio", and the key containing "cover"/"image", falling back to the
  first/second file) so it doesn't matter exactly what n8n calls the uploads. Blank
  color fields are ignored server-side rather than erroring. Returns
  `{ jobId, statusUrl, downloadUrl }`.
- **Render Job** — keeps `statusUrl`/`downloadUrl` from whichever upload branch ran,
  for the polling loop to reference.
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

Open the form URL in a browser: upload an audio file, pick a **Style** and
**Language Code**, optionally upload a **Cover Image** and fill in
**Background Color**/**Font Color**/**Highlight Color** and
**Title**/**Description**/**Episode Label**, and submit. The page won't respond until the video is fully rendered — expect anywhere
from under a minute (short clips) to several minutes (long files, cold Chromium
start) — then the MP4 downloads.

n8n Form Trigger endpoints also accept a plain programmatic `multipart/form-data`
POST (same field names as the form labels: `Audio File`, `Style`, `Cover Image`,
`Background Color`, `Font Color`, `Highlight Color`, `Title`, `Description`,
`Episode Label`, `Language Code`), if you
want to call this from a script instead of a browser.

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

## Testing: always resubmit the form, never use n8n's "Retry"

n8n's **Retry** button on a past execution replays it from *saved* execution data,
not a fresh HTTP request — and file uploads are one of the more fragile things to
replay that way. If you retry an execution that involved uploading a file, you may
see `Unexpected end of form` from the API (the upload arrives truncated). This is
an n8n replay artifact, not a bug in this workflow or the API — a genuinely fresh
form submission in the browser is the correct way to test again.

## A note on how this was built

I authored this workflow's JSON by hand rather than exporting it from a running
n8n instance, since I don't have one to test against here. The overall structure,
node wiring, and expressions are correct n8n patterns, but two specific details are
best-effort and worth a quick look after you import:

- **Form Trigger's file-field binary property names**: the upload nodes pick the
  audio and cover by name (a key containing "audio" / "cover" or "image"), falling
  back to the first/second uploaded file, and **Has Cover Image?** counts uploaded
  files. If your n8n version names the keys differently or includes an empty entry
  for a skipped Cover Image field, those three expressions are the only place to adjust.
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
  and hardcode `style`/`background`/etc. as fixed values in **Config** — this is
  what an earlier version of this workflow did; ask if you want that variant instead
  or alongside this one.
- **Extra config overrides** (e.g. selecting a config preset file, `mode: "webhook"`):
  add another `formData` entry to **Upload Audio**'s body parameters, sourced from
  a new field on the form (or a fixed value in **Config**).
