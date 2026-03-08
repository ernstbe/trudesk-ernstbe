# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trudesk is a help desk / ticketing system built with Express + Handlebars (server-rendered) and React 18 (client islands). It uses MongoDB 8 via Mongoose 8, optional Elasticsearch 8, and Socket.IO for real-time features.

## Commands

```bash
# Install dependencies (--legacy-peer-deps required)
npm install --legacy-peer-deps

# Production build (Grunt: minifies UIKit/CSS, then runs webpack production build)
npm run build

# Dev webpack (single build)
npm run webpackdev

# Dev webpack (watch mode for frontend changes)
npm run webpackwatch

# Start server (default port 8118)
npm start

# Tests (Mocha + Chai, uses in-memory MongoDB — no external DB needed)
npm test
npm run test -- --grep "pattern"    # run specific tests

# Lint (StandardJS)
npm run lint

# Format
npm run format
```

## Architecture

### Server

- **Entry:** `app.js` — loads config from `config.yml`, connects MongoDB, initializes webserver, Socket.IO, Elasticsearch, mail checker, migrations, and task runner.
- **Webserver:** `src/webserver.js` — Express app setup, calls middleware and route registration.
- **Middleware:** `src/middleware/index.js` — sessions (MongoDB store), Passport auth, CORS, CSRF tokens, maintenance mode, static files.
- **Routes:** `src/routes/index.js` — registers page routes, API v1/v2, plugin routes, and Swagger docs at `/apidoc`.
- **Auth:** `src/passport/index.js` — Passport strategies: local (username/password + bcrypt), TOTP (2FA), JWT (API/Socket.IO). Role middleware: `isAdmin`, `isAgent`, `isAgentOrAdmin`, `canUser('permission')`.
- **API v1:** `src/controllers/api/v1/routes.js` — RESTful, permission-gated via `canUser()`.
- **API v2:** `src/controllers/api/v2/routes.js` — token-based auth via `apiv2Auth`, includes MFA/batch endpoints.
- **Models:** `src/models/` — Mongoose schemas (ticket, user, group, department, team, etc.).
- **Socket.IO:** `src/socketserver.js` — authenticates via JWT or session cookies. Socket modules in `src/socketio/` handle tickets, chat, notifications, notices, account import, backup/restore, and log streaming. Global references: `global.io`, `global.socketServer.eventLoop` (5s interval).
- **i18n:** `src/i18n/` — server-side translations (EN, DE) used in email templates.
- **Views:** `src/views/` — Handlebars templates with `express-hbs`.

### Client (React Islands Architecture)

React components mount into server-rendered Handlebars pages via container divs with specific IDs (e.g., `dashboard-container`, `tickets-container`, `single-ticket-container`).

- **Renderer:** `src/client/renderer.jsx` — detects container divs, reads `data-*` attributes for initial state, mounts React trees with `createRoot()`. Each island is wrapped in a Redux Provider.
- **Store:** `src/client/app.jsx` — Redux store with `redux-saga` and `redux-saga-thunk` middleware.
- **Reducers:** `src/client/reducers/` — `shared` (session, socket, online users), `common` (roles, view data), plus domain reducers for tickets, accounts, groups, teams, departments, messages, settings, dashboard, search, notices, and UI state (modal, sidebar).
- **Sagas:** `src/client/sagas/` — async side effects per domain. Common saga handles socket init, session user loading, and initial data fetching.
- **Actions:** `src/client/actions/` — Redux action creators.
- **Socket client:** `src/client/lib/socket.js` — singleton hook pattern via `react-singleton-hook`.

### Build Pipeline

- **Grunt** (`Gruntfile.js`): `grunt build` = minify UIKit vendor JS + minify CSS + webpack production build. Also provides `grunt server` for dev with file watching.
- **Webpack** (`webpack.config.js`): Bundles `src/public/js/app.js` (legacy jQuery/module system) and vendor libs (jQuery, DataTables, Modernizr, Underscore). Babel for ES6/JSX, SASS extraction, gzip compression in production.

### Test Structure

- **Framework:** Mocha + Chai + Supertest
- **Database:** `mongodb-memory-server` (in-memory, no external DB)
- **Setup:** `test/0_database.js` — creates in-memory MongoDB, initializes models, seeds ticket types/statuses.
- **Test dirs:** `test/models/` (model unit tests), `test/api/` (API endpoint tests), `test/source/` (utility tests like i18n).

## Conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.) — enforced by commitlint + husky.
- Code style: StandardJS + Prettier (120 char width, single quotes).
- Package manager: Yarn 3.2.1 (`packageManager` field in package.json).
- Node.js >= 20.19.0 required.
- React components have been migrated from class components to functional components with hooks.
