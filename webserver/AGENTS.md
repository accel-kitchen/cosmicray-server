# Repository Guidelines

## Project Structure & Module Organization
- `server.js`: Express API for auth, data upload, and viewer endpoints.
- `public/`: Static assets (served at `/`).
- `cosmic-watch-measurement-webserver.py`: Python client/uploader for detector data.
- `cosmicray-data/`: Server-side per-ID data storage (`<id>/<YYYY-MM-DD>.dat`).
- `data/`: Local client backups created by the Python script.
- `setup-user.js`: CLI to create users in `users.json`.
- `users.json`: User store with password hashes (do not commit real data).
- `package.json`: Node scripts and dependencies; `requirements.txt`: Python deps.

## Build, Test, and Development Commands
- Start server: `npm start` (runs `node server.js`).
- Dev server with reload: `npm run dev` (requires `nodemon`).
- Health check: `curl http://localhost:3000/health`.
- Create user: `node setup-user.js <user_id> <password> [comment] [lat] [lon]`.
- Python deps: `pip install -r requirements.txt`.
- Run uploader: `python3 cosmic-watch-measurement-webserver.py`.

## Coding Style & Naming Conventions
- JavaScript: 4-space indent, semicolons, single quotes, camelCase for variables/functions.
- Python: 4-space indent, snake_case for names, follow PEP 8.
- Files: lowercase with hyphens or underscores (e.g., `setup-user.js`).
- JSON: 2-space indent; stable key order when writing.

## Testing Guidelines
- No automated tests yet. Use manual checks:
  - Auth: `curl -X POST :3000/auth/login -H 'Content-Type: application/json' -d '{"id":"demo","password":"..."}'`.
  - Data APIs: `GET /api/files/:id`, `GET /api/download/:id/:filename`.
- If adding tests, colocate under `tests/` and use descriptive names (e.g., `server.auth.test.js`).

## Commit & Pull Request Guidelines
- Commits: imperative, concise subject (≤72 chars). Prefer Conventional Commits (e.g., `feat: add /auth/refresh endpoint`).
- PRs: clear description, rationale, steps to verify (commands/curls), linked issues, and screenshots for UI changes under `public/`.

## Security & Configuration Tips
- Set `JWT_SECRET` in the environment for production; never hardcode secrets.
- Treat `users.json`, `cosmicray-data/`, and `data/` as sensitive; exclude from VCS.
- Server listens on `0.0.0.0:3000`; ensure firewall and TLS are configured in deployments.
