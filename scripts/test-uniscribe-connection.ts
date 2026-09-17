#!/usr/bin/env node
/**
 * Sanity-checks UniScribe API access before relying on it in the pipeline:
 *   1. Confirms UNISCRIBE_API_KEY is valid and the plan tier has API access.
 *   2. Lists recent transcriptions (cheap, no new job created).
 *   3. If a transcription id is passed, fetches it and reports whether
 *      word-level timestamps are present (segments[].words[]) or only
 *      phrase-level (segments[].start/end/text) — this determines whether
 *      the interpolation fallback in src/transcript/interpolate.ts is needed.
 *
 * Usage:
 *   npm run test:uniscribe                  # just checks auth + lists jobs
 *   npm run test:uniscribe -- <transcription_id>
 */
import "dotenv/config";
import { UniScribeClient } from "../src/uniscribe/client.js";
import { InvalidApiKeyError, ApiAccessDeniedError } from "../src/errors.js";

async function main() {
  const apiKey = process.env.UNISCRIBE_API_KEY;
  if (!apiKey) {
    console.error("UNISCRIBE_API_KEY is not set. Add it to your .env file.");
    process.exit(2);
  }

  const client = new UniScribeClient({ apiKey, baseUrl: process.env.UNISCRIBE_BASE_URL });
  const explicitId = process.argv[2];

  try {
    const list = await client.listTranscriptions({ limit: 1 });
    console.log("Auth OK. Sample response from /api/v1/transcriptions:");
    console.dir(list, { depth: 5 });

    const targetId = explicitId ?? list.items[0]?.id;
    if (!targetId) {
      console.log("\nNo transcription id available to inspect. Pass one explicitly:");
      console.log("  npm run test:uniscribe -- <transcription_id>");
      return;
    }

    const full = await client.getTranscription(targetId);
    const segments = full.result?.segments ?? [];
    const hasWordLevel = segments.length > 0 && segments.every((s) => Array.isArray(s.words) && s.words.length > 0);

    console.log(`\nTranscription ${targetId} status: ${full.status}`);
    console.log(`Segments: ${segments.length}`);
    console.log(`Timestamp granularity: ${hasWordLevel ? "WORD-LEVEL (segments[].words[])" : "PHRASE-LEVEL ONLY — interpolation fallback will be used"}`);
    if (segments[0]) {
      console.log("\nFirst segment sample:");
      console.dir(segments[0], { depth: 5 });
    }
  } catch (err) {
    if (err instanceof InvalidApiKeyError) {
      console.error("FAILED: API key is invalid.", err.message);
    } else if (err instanceof ApiAccessDeniedError) {
      console.error("FAILED: API access denied — plan tier does not include API access (needs Basic tier or above).", err.message);
    } else {
      console.error("FAILED:", err);
    }
    process.exit(1);
  }
}

main();
