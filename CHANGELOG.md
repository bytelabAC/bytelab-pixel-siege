# Changelog

All notable changes to **BYTELAB · Pixel Siege** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.0] — 2026-11-10

### Added

- **Level briefing.** Every level now opens with a card listing the birds you are given, how many of each, and what their ability does. `Enter`/`Space` starts, and the screen can be turned off in the settings.
- **Bird queue.** The rest of the squad waits behind the slingshot and the next bird hops into the pouch after each shot.
- **Steel blocks.** A fourth late-game material (`steel`) with 4.6 HP and 4300 toughness, used in levels 16, 17, 19 and 20.
- **Flight trail** behind a launched bird, plus a landing squash and wing animation.
- **Leaderboard UI** in the front end: top ten per level, own row highlighted, loading/empty/error states, and a local-best row when you are not on the board.
- **Custom levels as JSON** in the settings screen, validated and clamped server-side (40 levels × 90 blocks × 12 bugs × 10 birds).
- **Bundled brand fonts**: Vazirmatn (400/500/700) and JetBrains Mono (400/700 latin), self-hosted under the SIL OFL with their license texts.
- `tools/fetch-fonts.js`, `tools/test-php-levels.php`, `tools/test-demo.js` and `tools/render-frames.js`.
- Bilingual README (English + Persian), `LICENSE`, `CHANGELOG.md` and `.gitignore`.

### Changed

- **Difficulty.** Panels 2.0 → 2.6 HP (1700 → 2050 toughness), walls 2.4 → 3.6 HP (2400 → 3100), deep 1.6 → 2.2 HP, so a single clean hit cracks a block instead of deleting it.
- **Bird art**: crest, brow, two-tone beak, belly, flapping wing and tail feathers, and a heading-aligned flight pose.
- **Bug art**: cyan legs and antennae, amber eyes with glints, a grin, circuit glitch pixels and crack damage.
- The slingshot now draws its fork behind the bird so the loaded bird reads clearly.
- Mobile layout: seven-column level grid so twenty levels fit inside the 16:9 frame.
- `players` on the leaderboard endpoint now include a `you` flag for the current user.

### Fixed

- The canvas no longer paints a focus ring when a level is started with the mouse.
- The HUD logo is an HTML wordmark instead of SVG text, so it keeps the brand's monospace stack everywhere.

## [1.0.0] — 2026-11-09

### Added

- First release: twelve levels, three bird types, three star ratings, local best scores.
- Rigid-body physics engine (SAT, warm-started sequential impulses, sleeping).
- Shortcode `[bytelab_pixel_siege]` and a Gutenberg block.
- Optional score storage for logged-in users and guests, with a REST endpoint and rate limiting.
- Settings screen, uninstall cleanup, POT file.
