# Phase 2 Live Tennis API feasibility spike

Status: tooling ready; authenticated observations are pending a locally configured free key. No provider data is used by the product runtime.

## Setup

1. Request a no-card key from [Live Tennis API Free](https://livetennisapi.com/subscribe/free).
2. Copy `.env.example` to `.env.local`.
3. Set `LIVE_TENNIS_API_KEY` in `.env.local`. Keep the key out of chat and Git.
4. Run the survey:

   ```sh
   npm run provider:spike -- survey
   ```

The survey checks usage first and stops if its maximum of 12 quota-counted calls could cross Slate's 80-call daily ceiling. It captures ATP and WTA live singles, upcoming singles, US Open tournament records, and representative match, score, and player details when available. `/usage` calls are quota-exempt according to the provider documentation.

Responses and a manifest are written with owner-only file permissions under `.local/provider-samples/live-tennis/<timestamp>/`. The entire `.local/` directory is ignored. Raw provider data must stay there and must never become test fixtures or enter a commit.

## Live-change observations

When the survey reports a live match ID, capture its score at useful moments with:

```sh
npm run provider:spike -- observe <match-id>
```

Each observation makes one quota-counted request after checking daily usage. Collect at least ten distinct provider changes over time; repeated identical responses do not count as changes. Do not automate a rapid loop around the free feed.

## Evaluation record

Do not mark checklist task #32 complete until authenticated evidence answers each item:

- [ ] Free-tier identity and daily usage are confirmed.
- [ ] ATP and WTA live and upcoming singles are present or honestly empty.
- [ ] Match IDs round-trip across list, detail, and score endpoints.
- [ ] Player IDs round-trip from matches to player detail.
- [ ] ATP and WTA US Open tournament IDs can map to one Slate group.
- [ ] Sets, games, nullable points, server, and tiebreak state match visible play.
- [ ] Retirement, suspension, postponement, cancellation, and walkover shapes are observed or explicitly remain unverified.
- [ ] At least ten distinct live changes establish update delay and missing-data behavior.
- [ ] The usage response and response headers support the planned 80-call guard.
- [x] The published terms allow responses within an application and storage reasonably necessary to operate it; public deployment still needs a documented decision on attribution, caching duration, and display rights.

If the initial usage shape is not recognized, the tool stops after the quota-exempt `/usage` request and leaves that response in the ignored capture directory. Update the parser from that observed shape before making quota-counted calls.
