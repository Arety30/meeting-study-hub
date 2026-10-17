# Meeting and Study Room Hub

Meeting and Study Room Hub is a desktop application (Electron + Express + React) that bundles the pieces of a study session into one window: a video "lounge" with your own camera and screen share, a persistent group chat with two optional study-companion personas, a NotebookLM-style sources panel where you paste lecture notes and ask questions about them, a synthesis panel that turns those sources and the meeting transcript into a study guide, flashcards, action items or a summary, a markdown note vault with `[[wiki-links]]`, backlinks and a force-directed graph, and a monthly calendar for scheduling meetings. The backend keeps users, sessions, meetings and chat in memory and answers the companion requests either through the Gemini API, when a key is configured, or through built-in offline stand-in responses so the whole app works with no network at all.

## Where it is used

In Abrar's setup this is a personal study tool: it runs as a packaged Linux desktop app, is opened for a revision session, and gives one place to keep notes, generate flashcards from them and schedule the next session. The offline fallback means it is usable on a laptop without an API key or internet connection.

## How it works

### Processes

```
Electron main (electron/main.cjs)
  └─ spawns: node dist/server.cjs  (Express on :3000)
       ├─ serves the built React app from dist/
       └─ /api/*  auth, meetings, chat, companion endpoints
  └─ BrowserWindow -> http://localhost:3000  (contextIsolation on, preload.js)
```

- `electron/main.cjs` (the `main` in `package.json`) spawns `node dist/server.cjs` with `PORT=3000`, polls the port every 200 ms for up to 30 s, then opens a 1280x800 window; closing all windows kills the child.
- `electron-main.cjs` is an alternative entry that finds a free port from 3000 upward and `require`s the server inside the main process instead of spawning it.
- `preload.js` only logs that it loaded; no Node APIs are exposed to the page.

### Backend (`server.ts`)

- Express with a 15 MB JSON limit. In development (`NODE_ENV != production`) it mounts Vite in middleware mode for hot reload; in production it serves `dist/` statically with an SPA fallback.
- **In-memory data.** `usersDb` (email -> user with a SHA-256 password hash), `sessions` (random 16-byte hex token -> email), `meetingsDb` pre-seeded with three example meetings relative to today, and `persistedChatMessages` seeded with one welcome line. Nothing is written to disk; restarting the server clears accounts, meetings and chat.
- **Auth routes.** `POST /api/auth/register` and `/login` return `{token, user}`; `/logout` deletes the token; `GET /api/auth/me` validates a bearer token.
- **Meetings.** `GET /api/meetings`, `POST /api/meetings` (`title, date, time, duration, invites` as a comma-separated string; organiser is taken from the session or "Guest Student").
- **Chat.** `GET /api/chat`, `POST /api/chat` append to the shared list with a `HH:MM` timestamp.
- **Companion endpoints** (each available under `/api/local/...` and `/api/gemini/...`):
  - `chat`: builds a system prompt from the chosen persona ("Lumina", warm and encouraging, or "Dr. Keith", analytical), the uploaded documents and the transcript, and asks `gemini-3.5-flash` for a 100-150 word reply.
  - `summarize`: `type` is `study_guide`, `flashcards` (JSON schema enforced: exactly six `{question, answer}`), `action_items` or a default executive summary.
  - `speech-to-text`: despite the name it does not process audio; it receives a text prompt and returns a short, realistic "spoken" sentence. In the UI this backs the dictation buttons.
  - If `GEMINI_API_KEY` is missing or a call fails, `simulateLocalLlamaChat`, `simulateLocalLlamaSummarize` and `simulateLocalWhisperSTT` return keyword-matched canned text so every feature still produces output.

### Frontend (`src/`)

| Component | What it does |
|---|---|
| `App.tsx` | Login/register screen (token kept in `localStorage` under `studysync_token`), top tabs **Lounge / Vault / Calendar**, participant list, transcript state, the consent toggle that lets companion personas join, the monthly calendar grid with a scheduling form that POSTs to `/api/meetings`. |
| `components/MeetingStage.tsx` | Video grid. Requests the local camera/microphone with `getUserMedia`, offers `getDisplayMedia` screen share, animates simulated speaking for the other (scripted) participants, hides companion tiles until consent is given. |
| `components/MeetingChat.tsx` | Polls `/api/chat`, posts user messages, asks `/api/local/chat` for the active persona's reply and posts it back so every client sees it, optional read-aloud with the browser's `speechSynthesis`, "dictate" button that calls `/api/local/speech-to-text`. |
| `components/NotebookLM.tsx` | Sources list with two preset documents, a form to add a document by pasting text (optional source URL, word count computed), and a Q&A box that sends the question plus selected sources to `/api/local/chat`. |
| `components/NotesPanel.tsx` | Buttons for study guide, flashcards (flip cards using the CSS perspective helpers in `index.css`), action items and summary via `/api/local/summarize`. |
| `components/ObsidianWorkspace.tsx` | Note vault with three seeded markdown files, create/rename/delete, tag parsing, `[[Note.md]]` link detection and a backlinks pane, file import via `FileReader`, a plugin list (toggle flags only), and a hand-written force simulation (repulsion, link springs, gravity, damping) rendered as SVG for the graph view. |
| `types.ts` | Shared interfaces: `Document`, `Participant`, `ChatMessage`, `TranscriptEntry`, `Flashcard`, `ObsidianFile`, `ObsidianPlugin`, `GraphNode`, `GraphLink`. |

Styling is Tailwind CSS 4 (via `@tailwindcss/vite`) with Outfit/Inter/JetBrains Mono fonts; animations use the `motion` library; icons come from `lucide-react`.

## Setup

Requirements: Node.js 18+ and npm. A Gemini API key is optional. For packaging: `electron-builder` (installed as a dev dependency) and, for the Windows target, Wine on Linux.

```bash
cd ~/G/meeting
npm install
cp .env.example .env        # optional
```

`.env`:

```ini
GEMINI_API_KEY=your-key-or-leave-empty
APP_URL=
```

`PORT` and `NODE_ENV` are set by the Electron launcher; when running the server by hand they default to `3000` and development mode.

## Usage

```bash
# web dev server (Express + Vite HMR) on http://localhost:3000
npm run dev

# type-check
npm run lint

# production build: React -> dist/, server -> dist/server.cjs
npm run build
npm start                     # node dist/server.cjs

# desktop
npm run electron:dev          # needs a prior `npm run build`
npm run dev:electron          # dev server + Electron once :3000 answers
npm run electron:build        # package for the current platform -> dist-electron/
npm run electron:build:all    # .deb and Windows NSIS installer
```

Typical session: register an account on the first screen, allow the camera in the Lounge, paste lecture notes into the Sources panel, ask a question, switch the right-hand tab to Synthesis and generate flashcards, write notes in the Vault with `[[links]]` and open the graph, then schedule the next meeting from the Calendar tab.

## Project structure

```
meeting/
├── electron/main.cjs        # Electron entry (spawns the server)
├── electron-main.cjs        # alternative in-process Electron entry
├── preload.js
├── server.ts                # Express API + Vite/static hosting
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types.ts
│   ├── index.css
│   └── components/
│       ├── MeetingStage.tsx
│       ├── MeetingChat.tsx
│       ├── NotebookLM.tsx
│       ├── NotesPanel.tsx
│       └── ObsidianWorkspace.tsx
├── metadata.json            # app name, description, camera/microphone permissions
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

## Limitations and notes

- All server data is in memory: accounts, meetings and chat disappear when the app closes. Notes in the Vault and uploaded sources live only in React state and are lost on reload too.
- There is no real multi-user video: the camera and screen share are local previews, and the other participants are scripted. The chat is shared only between clients talking to the same server process.
- "Speech-to-text" generates text from a text prompt; it does not listen to the microphone.
- Passwords are hashed with unsalted SHA-256 and sessions are plain in-memory tokens; this is fine for a local desktop app, not for a public deployment.
- The companion prompts instruct the model to describe itself as a locally hosted model even when Gemini is answering; the offline fallback texts repeat that framing.
- `electron-main.cjs` and `electron/main.cjs` overlap; `package.json` uses the latter.
- The `meeting-and-study-room-hub.zip`, `dist/`, `dist-electron/` and `node_modules/` are build artefacts and should not be committed.
