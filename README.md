# The Living Archive

A hands-first, AI-powered mixed-reality diorama for the
Meta VR Start Developer Competition 2026 (IWSDK / WebXR track).

## Run

    npm install
    npm run dev

Open http://localhost:5173 in Chrome with the
Immersive Web Emulator extension installed.

## Track
- Division: New Experience
- Track: (choose: Entertainment / Gaming / Productivity)

## Structure
- `src/main.js`              — entry point
- `src/systems/`             — ECS systems (growth, hands, AI, audio, UI)
- `src/components/`          — scene objects (Seed, Structure, TalkButton)
- `src/utils/`               — config, speech, LLM client
- `public/assets/`           — audio, textures, models