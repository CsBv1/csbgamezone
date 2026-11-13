# Plan: Server-decided game rewards (phased)

Goal: players can no longer give themselves rewards from their browser. The server decides every payout, one area at a time. Rates and prices stay the same unless noted.

## Phase 1 — Holder-only game access (12 games)
Arcanist, Alchemy, Heist, Chronicle, Architect, Senate, Odyssey, Bounty Hunt, Auction, Stake Royale, Stake Dynasty, Rune Conclave.
- Entry checked on the server against the bull count saved by the wallet scanner.
- The 1 Key entry fee is taken in the same step as the access check.

## Phase 2 — Daily rewards and missions
- Daily calendar claim decided on the server (one claim per day, fixed reward).
- Mission progress claims verified on the server; reward amounts fixed server-side.

## Phase 3 — Diamonds and Credits from games
- Each game ends by calling one server "finish game" step with the game name.
- Server applies a fixed per-game maximum payout and a per-hour limit, plus the +10% per bull boost.
- Idle games (Bull Kingdom, Diamond Mines) pay based on time passed since the last save, capped server-side.
- Direct balance writes from the browser are then switched off.

## Phase 4 — Scores and multiplayer payouts
- Maze and tournament times: server records start time, finish time is measured server-side.
- Crash / multiplayer room payouts settled by the server from room state.

## Phase 5 — Battles, card duels, world bosses, Bull World
- Battle and TCG duel winners paid from the existing server battle state.
- World boss damage limited per hit and per second; boss loot paid by server.
- Bull World character stats and level-ups calculated on the server.

## What may feel different
- Some idle games may pay slightly less if players were exceeding realistic rates.
- A short delay (under a second) when a game ends while the server confirms the reward.

## Technical details
- Each phase: SECURITY DEFINER RPCs using auth.uid(), advisory locks, fixed server catalogs; revoke client INSERT/UPDATE on the affected tables; small live test per rule in tests/.
- Findings marked fixed only after the matching client write path is revoked.
- Phase 1 first, then continue on "next".
