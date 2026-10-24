# Star Statusc0rd Replica - Implementation Plan

## Goal
1-to-1 replica of Star Statusc0rd: Web-based Discord Rich Presence builder that generates a config file. User runs a local RPC client (Node.js) that reads the config and applies custom activity via Discord RPC (Client ID only, no user tokens).

## Architecture (Single Shared Discord App)

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Free Tier)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Next.js Dashboard (React + TS)            │   │
│  │  • Activity Builder UI (all RPC fields)             │   │
│  │  • Live Discord Preview (placeholder images)        │   │
│  │  • Export config.json (with YOUR Client ID)         │   │
│  │  • Save/Load from localStorage                       │   │
│  │  • Setup Guide (how to run client)                  │   │
│  │  • Download Client button                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                    config.json (download)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    USER'S MACHINE                            │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │  Discord Desktop    │◄───│  RPC Client (Node.js)    │   │
│  │  Client (Running)   │    │  • Reads config.json     │   │
│  └─────────────────────┘    │  • Connects via YOUR     │   │
│                             │    Client ID (pre-filled)│   │
│                             │  • Sets Rich Presence    │   │
│                             │  • Auto-reconnect        │   │
│                             │  • Rotation support      │   │
│                             │  • Hot reload config     │   │
│                             └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key Point**: You (dev) create ONE Discord Application. You upload all Rich Presence Art Assets to YOUR App's Developer Portal. The Dashboard has YOUR Client ID pre-configured. Users download the config + client, run it - no Discord App creation needed.

## Features (Matching Star Statusc0rd)

### Web Dashboard
1. **Activity Builder Form** - All Discord RPC fields:
   - **Application ID (Client ID)** - Pre-filled with YOUR Client ID (read-only or hidden)
   - Activity Type: Playing / Streaming / Listening / Watching / Competing
   - Details (line 1, max 128 chars)
   - State (line 2, max 128 chars)
   - **Large Image Key + Hover Text** - Dropdown of YOUR uploaded asset keys from Dev Portal
   - **Small Image Key + Hover Text** - Dropdown of YOUR uploaded asset keys from Dev Portal
   - Buttons (max 2): Label + HTTPS URL
   - Timestamps: Start / End (Unix ms, date picker UI + "Start Now" button)
   - Streaming URL (required for Streaming type, Twitch/YouTube only)

2. **Live Preview** - Functional Discord-style render (not pixel-perfect, fast). Shows all fields, activity type badge, images as placeholders with selected key names.

3. **Multi-Activity Support** - Add/remove/reorder activities, set rotation interval (min 15s).

4. **Config Export** - Download `config.json` with all settings (includes YOUR Client ID).

5. **localStorage** - Save/load multiple named configs locally.

6. **Setup Guide Page** - Step-by-step for users:
   - Download config.json
   - Download client for their OS
   - Run `./star-rpc --config config.json`
   - Discord Desktop must be running

7. **Asset Helper** - Image key fields show dropdown of YOUR pre-uploaded asset keys (fetched from a static list you maintain).

### Local RPC Client (`star-rpc`)
1. **Config Loader** - Read `config.json` from:
   - `--config` CLI arg
   - Current directory
   - `~/.config/star-rpc/config.json`
   - **Hot reload**: Watch file with `fs.watch`, debounce 500ms, reapply activity on change

2. **RPC Connection** - Using `discord-rpc` (official) package:
   - Connect with Client ID from config
   - Auto-reconnect on disconnect (exponential backoff, max 30s)
   - Handle Discord client not running (clear error + retry)

3. **Activity Application** - Full field support:
   - All activity types including Streaming with URL (Twitch/YouTube only)
   - Image keys (Discord CDN - must match YOUR uploaded assets)
   - External image URLs (limited Discord support)
   - Buttons (max 2): Label + HTTPS URL
   - Timestamps: start (elapsed) / end (remaining)

4. **Rotation** - Cycle activities at `rotationInterval` (default 15s, min 15s enforced)

5. **Graceful Shutdown** - SIGINT/SIGTERM handling, clean RPC disconnect

6. **Distribution** - Single binary via `pkg` (Linux/macOS/Windows), also on npm

## Configuration Schema (`config.json`)

```json
{
  "clientId": "YOUR_CLIENT_ID_HERE",
  "rotationInterval": 15000,
  "activities": [
    {
      "type": "PLAYING",
      "details": "Building something cool",
      "state": "In development",
      "largeImageKey": "main_logo",
      "largeImageText": "Star Statusc0rd",
      "smallImageKey": "status_online",
      "smallImageText": "Active",
      "buttons": [
        { "label": "GitHub", "url": "https://github.com/..." },
        { "label": "Discord", "url": "https://discord.gg/..." }
      ],
      "timestamps": {
        "start": 1700000000000,
        "end": null
      }
    }
  ]
}
```

**Note**: `clientId` is pre-filled by dashboard. `largeImageKey`/`smallImageKey` must match asset keys YOU uploaded to YOUR Discord App's Dev Portal.

## Implementation Tasks

### Phase 1: Web Dashboard (Next.js on Vercel)
- [ ] Initialize Next.js 14+ project with TypeScript, Tailwind CSS, App Router
- [ ] Create main page (`/`) with Activity Builder form
- [ ] **Pre-fill Client ID** from environment variable (your Client ID)
- [ ] Build form components for each RPC field with validation (char limits, URL format, Twitch/YouTube for streaming)
- [ ] **Asset key dropdown** - Static list of YOUR uploaded asset keys (maintain in code/config)
- [ ] Implement Live Preview component (functional Discord-style, fast, placeholder images)
- [ ] Add multi-activity management (add/remove/reorder, drag-drop)
- [ ] Implement config.json download (blob download, includes Client ID)
- [ ] Add localStorage persistence (save/load named configs)
- [ ] Create `/guide` page with user setup instructions (download config + client + run)
- [ ] Add "Download Client" section with platform detection (GitHub Releases links)
- [ ] Deploy to Vercel (connect GitHub repo, set `NEXT_PUBLIC_CLIENT_ID` env var)

### Phase 2: Local RPC Client (Node.js)
- [ ] Initialize Node.js project with TypeScript
- [ ] Add `discord-rpc` (official) dependency
- [ ] Implement config loader (file + CLI args + default paths)
- [ ] Build RPC client class with:
  - Connection management
  - Auto-reconnect logic (exponential backoff, max 30s)
  - Activity setter (all fields, validate Streaming URL)
  - Rotation scheduler (min 15s interval)
  - **Config file watcher** (`fs.watch` + 500ms debounce, reapply on change)
- [ ] Add CLI entry point (`star-rpc [--config path]`)
- [ ] Package with `pkg` for 3 platforms (Linux/macOS/Windows)
- [ ] Create GitHub Actions workflow for releases (build + upload artifacts)
- [ ] Publish to GitHub Releases + npm

### Phase 3: Integration & Polish
- [ ] Link dashboard download buttons to GitHub Releases
- [ ] Generate example config from dashboard state
- [ ] Add error handling + user-friendly messages
- [ ] Write comprehensive README
- [ ] Test end-to-end on clean machine

## Free Hosting & Distribution

| Component | Platform | Cost |
|-----------|----------|------|
| Dashboard | Vercel (Hobby) | Free |
| Client Binaries | GitHub Releases | Free |
| Client npm Package | npmjs.com | Free |
| CI/CD | GitHub Actions | Free |

## Prerequisites

### For You (Dev - One-time Setup)
1. **Create Discord Application** at discord.com/developers/applications
2. **Copy Client ID** from OAuth2 > General
3. **Upload Rich Presence Art Assets** at Application > Rich Presence > Art Assets
   - Note each asset's **key** (filename without extension)
4. **Configure Dashboard** with your Client ID + asset key list
5. **Deploy Dashboard** to Vercel
6. **Build & Release Client** binaries to GitHub Releases

### For End Users (Zero Setup)
1. **Discord Desktop Client** - Must be running
2. **Download** config.json from dashboard
3. **Download** client for their OS (Linux/macOS/Windows)
4. **Run** `./star-rpc --config config.json`

**No Discord Developer Account needed for users. No OAuth. No tokens.**

## Validation Checklist

- [ ] All 5 activity types render correctly in Discord
- [ ] Streaming type requires and uses Twitch/YouTube URL
- [ ] Buttons (1-2) open correct URLs in browser
- [ ] Images load from Discord CDN keys (uploaded to Dev Portal)
- [ ] External image URLs work (if provided)
- [ ] Timestamps show elapsed/remaining time
- [ ] Rotation switches activities at interval (≥15s enforced)
- [ ] Reconnection works after Discord restart
- [ ] Config file hot-reload updates activity without restart
- [ ] Binary runs on Linux/macOS/Windows without Node.js
- [ ] Clear error when Discord client not running
- [ ] Clear error when Client ID invalid

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Discord RPC rate limits | Enforce rotationInterval ≥ 15s in dashboard + client |
| Discord client not running | Clear error message + auto-retry (client) |
| Asset key mismatch | Dashboard dropdown only shows YOUR valid keys; client validates on apply |
| STREAMING without Twitch/YT URL | Validate URL domain in dashboard + client |
| Binary false positives (AV) | Sign builds, provide npm alternative |
| Config file corruption | Validate JSON schema on load, show friendly errors |
| Hot reload conflicts | Debounce 500ms, only reapply on valid config |
| Shared Client ID abuse | Rate limited by Discord per IP/user; monitor usage |

---

**Status**: Ready for implementation. Begin with Phase 1 - Next.js Dashboard.