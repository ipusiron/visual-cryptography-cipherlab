# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VisualCryptography CipherLab is a web-based educational tool for demonstrating Visual Secret Sharing Scheme (VSSS). The project implements a 2-share visual cryptography system where images are split into noise-like shares that reveal the secret when overlaid.

## Architecture

### Core Implementation
- **Frontend-only application** using vanilla JavaScript, HTML5 Canvas API, and CSS
- **No build system or dependencies** - runs directly in browser as static files
- **2×2 pixel expansion** visual cryptography algorithm implemented in `script.js`
- **Pattern-based encoding** using 6 predefined subpixel patterns for share generation

### Key Files
- `index.html`: Single-page application with 4 tabs (Basics, Encrypt, Decode, Theory)
- `script.js`: Core VSS implementation including:
  - Image binarization with configurable threshold
  - Share generation using random pattern selection
  - Canvas-based overlay with offset adjustment
- `style.css`: Dark theme styling with CSS variables
- `examples/generate_vss_sample.py`: Python script for generating sample VSS images using PIL

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
# Creates: secret.png, shareA.png, shareB.png, overlay.png
```

## VSS Algorithm Details

The visual cryptography implementation uses:
- **6 base patterns** for subpixel encoding (defined in `PATTERNS` array)
- **Black pixels**: Share A gets pattern, Share B gets inverted pattern
- **White pixels**: Both shares get the same pattern
- **Overlay operation**: Uses Canvas API's 'darken' composite mode

## Testing Approach

No automated tests exist. Manual testing involves:
1. Upload test images via Encrypt tab
2. Download generated shares
3. Load shares in Decode tab to verify reconstruction
4. Adjust offset parameters to test alignment features