# Live Tennis API Free evaluation

Status: authenticated feasibility in progress. The initial survey passed the basic live-score and identity checks, exposed several provider quirks, and has not yet completed the required WTA-live and ten-change observations.

The server client and endpoint decoders now encode this verified structural inventory under `src/providers/live-tennis`. HTTP response bodies remain `unknown` until the matching decoder accepts them; this does not close the outstanding live-observation gate.

Evidence was captured on September 9, 2026 under the ignored `.local/provider-samples/live-tennis/` directory. This document records only structural findings; it does not reproduce raw responses.

## Confirmed

- The credential reports the `free` tier with 100 requests per day and 30 per minute.
- ATP and WTA singles filters are accepted on match, fixture, and tournament endpoints.
- Observed ATP and WTA live matches supplied sets, per-set games, current points, server, timestamps, sequence, and non-tiebreak state. The WTA live match also resolved to the reviewed US Open WTA tournament identity.
- The same ATP match ID resolved through live listing, match detail, score detail, and its fixture's `match_id`. Its player ID resolved through player detail.
- A WTA scheduled match resolved through fixture `match_id`, upcoming-match listing, match detail, and player detail.
- Player detail supplied current official singles ranking position, ranking points, movement, and explicit completeness metadata for the sampled ATP and WTA players.
- The US Open catalogue uses separate stable ATP and WTA tournament IDs (`1217` and `1218`). Both carry `grand_slam`, New York, US, and hard-court metadata, so a reviewed Slate mapping can join them into one competition group without runtime name matching.
- The explicit `/matches?status=upcoming&tour=…&draw=singles` query returned only `upcoming` rows with the requested tour and draw in both sampled categories.
- A match first discovered live remained available from its FREE detail endpoint after completion. Its stable ID, participants, tournament, completed lifecycle, and final score remained readable. The free tier can therefore finalize a match Slate already tracks even though it cannot list arbitrary completed matches.

## Provider quirks the adapter must contain

- Fixture rows have their own `id` and a separate `match_id`. The shared match identifier is `match_id`, despite reference prose saying the fixture's `id` is the match ID.
- `/fixtures` is a schedule feed rather than an upcoming-only lifecycle list. Observed responses included `scheduled`, `live`, and `finished` rows. Some future fixtures were labelled live while the corresponding filtered live-match listing was empty.
- Match and upcoming-list records had `start_time: null` in the sample. The fixture record carried the scheduled UTC instant. Normalization must combine fixture schedule fields with match lifecycle and identity fields.
- Tournament results returned the requested ATP/WTA split but did not expose a `draw` field. Tournament identity must come from its stable ID and reviewed registry, not from assuming the response echoes every filter.
- The provider documentation describes `/usage` as quota-exempt. Across repeated runs, the durable daily counter eventually advanced for the usage checks too. Slate must count every HTTP request against its own 80-call ceiling.
- Rate-limit headers varied between adjacent requests and are not sufficient by themselves for a durable daily budget. The usage response remains the authoritative preflight input, with conservative local accounting for the current run.
- Score `sources_count` changed in both directions across observations. Treat it as diagnostic metadata, not a monotonic quality or ordering signal.
- The completed match retained `points: ["0", "0"]` and a non-null server from its final observation. A completed lifecycle must suppress current-point and server presentation rather than treating those score fields as active play.
- A WTA live match’s list/detail score and score-detail endpoint briefly disagreed on game/point/server values and sequences. Treat the score endpoint as its own observation with its own freshness timestamp; do not merge fields from adjacent endpoint responses by inference.

## Live update sample

Four distinct ATP score sequences were observed over approximately three minutes, plus one repeated response. Provider timestamps were roughly 2–24 seconds behind capture time on the distinct responses. The samples demonstrated changing points, a stable server, and the current set appearing as `0–0` once represented in the games arrays. A later WTA live survey captured a live singles match with score endpoint point/server changes, but it is a single survey observation rather than a temporal WTA change series.

This is promising but below the ten-distinct-change gate. WTA live payload is now observed; tiebreak, retirement, suspension, postponement, cancellation, and walkover remain unobserved. Those states remain unverified rather than inferred from documentation.

## Provisional decision

Live Tennis API Free is viable for continuing to a decoder and normalizer only after the remaining live-observation gate is complete. The first product slice should use:

- `/matches?status=live` for live lifecycle and score state;
- `/matches?status=upcoming` for clean upcoming lifecycle and identity;
- `/matches/{id}` to refresh and finalize already-known matches, including after they leave the free live listing;
- `/fixtures` for scheduled UTC time, joined through `match_id` and never trusted as lifecycle truth;
- `/tournaments` plus reviewed Slate mappings for paired ATP/WTA tournament identity;
- `/players/{id}` for current player identity and ranking summary;
- `/usage` plus conservative application accounting for the local daily ceiling.

Do not build a decoder from fixture `id`, trust fixture status, infer missing start times, display final-match point/server fields as live state, or treat current player rankings as a full ranking table. The free feed still cannot discover Yesterday results that Slate did not already observe.
