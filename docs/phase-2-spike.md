# Phase 2 Live Tennis API feasibility spike

Status: initial authenticated survey complete; live observation remains in progress. Findings are recorded in [the provider evaluation](./phase-2-provider-evaluation.md). No provider data is used by the product runtime.

## Setup

1. Request a no-card key from [Live Tennis API Free](https://livetennisapi.com/subscribe/free).
2. Copy `.env.example` to `.env.local`.
3. Set `LIVE_TENNIS_API_KEY` in `.env.local`. Keep the key out of chat and Git.
4. Run the survey:

   ```sh
   npm run provider:spike -- survey
   ```

The survey checks usage first and stops if its maximum of 14 total provider calls could cross Slate's 80-call daily ceiling. It captures ATP and WTA live singles, upcoming singles, US Open tournament records, and representative match, score, and player details when available. The provider documentation describes `/usage` as quota-exempt, but the first authenticated run showed delayed counter movement that did not cleanly support that claim. Slate therefore budgets every request, including usage checks.

Responses and a manifest are written with owner-only file permissions under `.local/provider-samples/live-tennis/<timestamp>/`. The entire `.local/` directory is ignored. Raw provider data must stay there and must never become test fixtures or enter a commit.

To compare the provider's fixture feed with its explicit upcoming-match lifecycle query, run:

```sh
npm run provider:spike -- upcoming
```

This makes four total provider requests, including the two usage checks.

## Live-change observations

When the survey reports a live match ID, capture its score at useful moments with:

```sh
npm run provider:spike -- observe <match-id>
```

Each observation makes three total provider requests: usage, one score, then usage again. Collect at least ten distinct provider changes over time; repeated identical responses do not count as changes. Do not automate a rapid loop around the free feed.

## Evaluation record

Do not mark checklist task #32 complete until authenticated evidence answers each item:

- [x] Free-tier identity and daily usage are confirmed.
- [ ] ATP live and ATP/WTA upcoming singles are confirmed; WTA live remains unobserved.
- [x] Match IDs round-trip across list, detail, and score endpoints when fixture `match_id` is used.
- [x] Player IDs round-trip from matches and fixtures to player detail.
- [x] ATP and WTA US Open tournament IDs can map to one Slate group.
- [ ] Sets, games, nullable points, server, and non-tiebreak state were observed; an actual tiebreak remains unobserved.
- [ ] Retirement, suspension, postponement, cancellation, and walkover shapes are observed or explicitly remain unverified.
- [ ] Four of ten required distinct live changes establish an initial 2–24 second timestamp-delay range; one repeated response was excluded.
- [x] The usage response exposes the free tier's 100/day and 30/minute limits. Slate's guard conservatively counts every request because observed counter movement did not match the documentation's quota-exempt `/usage` claim.
- [x] The published terms allow responses within an application and storage reasonably necessary to operate it; public deployment still needs a documented decision on attribution, caching duration, and display rights.

If the initial usage shape is not recognized, the tool stops after the first `/usage` request and leaves that response in the ignored capture directory. Update the parser from that observed shape before making further provider calls.
