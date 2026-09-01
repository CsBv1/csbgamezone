# Fix Bull artwork across all game selectors

## Goal
Make every game that asks players to choose an owned Bull display the Bull’s wallet artwork instead of only its number or placeholder.

## Changes
- Strengthen the wallet NFT scan so it resolves CIP-25/CIP-68 image metadata across the formats used by Cardano indexers and normalizes IPFS links.
- Upgrade the shared owned-Bull hook to match asset IDs reliably, retain artwork during refreshes, seed missing Bull power records, and expose scan/loading state consistently.
- Migrate every Bull selection game to the shared artwork-aware data path, removing duplicated loaders that currently lose image data.
- Keep Bull levels, names, rewards, and gameplay unchanged.

## Validation
- Check all Bull-selection routes use the shared hook and render an image when wallet metadata contains one.
- Run focused checks and verify the project build diagnostics remain clean.

## Technical details
Affected areas include the Battle Arena, TCG and CSB Bull mini-games, Bull World, Level Dungeon, Level Tower, Ranch, Ascension, and other owned-Bull selectors.
