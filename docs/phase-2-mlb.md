# Phase 2 MLB vertical slice

Status: implemented behind an explicit environment flag.

Slate uses the public MLB Stats API schedule endpoint as the first MLB provider. It requires no API key or account for this private prototype. The adapter requests a three-day MLB schedule with team, linescore, and probable-pitcher details, then maps games involving the MLB teams already represented in Slate (Red Sox, Diamondbacks, Yankees, Dodgers, Padres, and Orioles) into the existing baseball scoreboard read model.

The integration is server-side and opt-in:

```sh
MLB_API_ENABLED=true
```

When enabled, MLB records replace the fictional baseball records for the request. Tennis and the other sports retain their existing behavior. If the request fails or the response does not decode, Slate serves the mock scoreboard instead. There is no browser-to-provider request, API key, background worker, polling loop, or new persistence migration in this slice.

The provider decoder accepts scheduled, live, final, postponed, cancelled, and suspended states; inning lines; score; current inning and half; outs; count; runners; batter; pitcher; probable pitchers; and venue. It intentionally leaves play-by-play, standings, rankings, and player statistics out of scope.

The MLB Stats API does not publish a general rate-limit contract. This slice therefore uses one request per server-rendered page load and the existing mock fallback. Before treating it as production infrastructure, verify current MLB usage terms, operational limits, and a refresh policy appropriate for the product.

