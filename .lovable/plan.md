# Bull City fantasy map refresh

## Goal
Restyle the existing Bull City map into an original, classic low-poly medieval fantasy world while preserving every current game and CMKR mining feature.

## Changes
- Replace futuristic road plates and cars with winding stone paths, wooden bridges, grass, dirt, farmland, forest, rock, and shoreline details.
- Restyle the existing buildings as colorful fantasy guild halls, mines, keeps, markets, towers, barns, docks, and temples using lightweight canvas shapes.
- Keep the same map size, bull movement, bull artwork, building positions, rewards, one-hour CMKR refill, auto-mining, leaderboard, and Discord payout announcement.
- Update visible map labels and the entry screen copy to match the fantasy city while retaining Cardano Stake Bulls branding.
- Correct the outdated “each day” mining text to “each hour.”

## Technical details
- Frontend-only canvas refactor in the existing Bull City page; no new packages, images, database changes, or cloud functions.
- Reuse the cached ground layer and current drawing loop to avoid adding load or cloud usage.
- Remove animated traffic work to improve performance.
- Validate the live map and current build after the change.
