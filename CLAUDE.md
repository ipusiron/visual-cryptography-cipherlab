# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VisualCryptography CipherLab is a web-based educational tool for demonstrating Visual Secret Sharing Scheme (VSSS). The project implements a (2,2) visual cryptography system where images are split into noise-like shares that reveal the secret when overlaid.

## Architecture

### Core Implementation
- **Frontend-only application** using vanilla JavaScript, HTML5 Canvas API, and CSS
- **No build system or dependencies** - runs directly in browser as static files
- **2×2 pixel expansion** visual cryptography algorithm. The logic lives in `js/vc-core.js` (DOM-free, on `globalThis.VCCore`); `script.js` only does the UI and canvas drawing
- **Pattern-based encoding** using 6 predefined subpixel patterns for share generation

### Key Files
- `index.html`: Single-page application with 4 tabs (基礎知識/Basics, 暗号化/Encrypt, 復号/Decode, 理論/Theory)
- `js/vc-core.js` (`VCCore`): pure logic — binarize, the 6 patterns, invert, `sharesForPixel`, `overlayBlock`, and `randomIndex`/`pickPattern` (unbiased selection via rejection sampling; the random source is injected, so tests are deterministic)
- `script.js`: UI only, using `VCCore`:
  - Image binarization using luminance formula (0.299R + 0.587G + 0.114B)
  - Share generation picking patterns with `crypto.getRandomValues` (never `Math.random` — a predictable PRNG would let one share plus the sequence recover the secret)
  - Canvas-based overlay with offset adjustment using 'darken' composite mode
  - Accordion UI for theory tab
- `style.css`: Styling with CSS variables
- `examples/generate_vss_sample.py`: Python script for generating sample VSS images using PIL (requires Pillow)

## Development Commands

### Running the Application
```bash
# Open index.html directly in browser (no server required)
start index.html

# Or use a local server for development
python -m http.server 8000
# Then open http://localhost:8000
```

### Generating Sample Images
```bash
cd examples
python generate_vss_sample.py
# Requires: mijinko.png in same directory
# Creates: secret.png, shareA.png, shareB.png, overlay.png
```

## VSS Algorithm Details

The visual cryptography implementation uses:
- **6 base patterns** (`PATTERNS` array in both `script.js` and Python): `[1,1,0,0], [1,0,1,0], [1,0,0,1], [0,1,1,0], [0,1,0,1], [0,0,1,1]`
- **Black pixels**: Share A gets random pattern, Share B gets inverted pattern → overlay shows full black (2×2)
- **White pixels**: Both shares get the same pattern → overlay shows 50% gray (half black, half white)
- **Overlay operation**: JavaScript uses Canvas 'darken' composite; Python uses logical OR

## Testing

```bash
node --test
```

- Node 22+, no dependencies (`node:test`). Runs in GitHub Actions on push and pull request. `test/load.js` loads the plain scripts with `vm.runInThisContext`
- `test/core.test.js` pins the 6 patterns, binarization (including threshold 0), share/overlay math (white→2 black, black→4 black), and the unbiased random selection. The random source is injected, so expected values are deterministic
- Manual check for the UI: generate shares in the Encrypt tab, download them, load them in the Decode tab and confirm the secret appears when overlaid
4. Adjust offset parameters to test alignment