# Phase 2: football-data.org slice

Slate has an opt-in, server-side Premier League adapter for the free football-data.org API.

Set `FOOTBALL_DATA_ENABLED=true` and `FOOTBALL_DATA_API_TOKEN` in the local environment. The adapter requests one UTC date window spanning yesterday, today, and tomorrow, sends the token in the `X-Auth-Token` header, and applies an eight-second timeout. It maps known Premier League clubs to Slate IDs, preserves soccer-specific score and goal presentation, and replaces only soccer mock records. Missing keys, rate limits, malformed responses, and network failures leave the mock scoreboard intact.

The free tier is treated as a low-frequency feasibility slice: no polling, queues, workers, WebSockets, or provider SDKs. The UI shows a live source label and attribution when this mode supplies data.
