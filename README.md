<h1 align="center">
<a href="http://trudesk.io"><img src="http://trudesk.io/TD_Black.png" width="500" /></a>
<br />Community Edition (Fork)
</h1>
<p align="center">
<a href="https://standardjs.com"><img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg?style=flat-square" /></a>
<a href="https://github.com/ernstbe/trudesk-ernstbe/actions"><img src="https://img.shields.io/github/actions/workflow/status/ernstbe/trudesk-ernstbe/ci.yml?branch=master&style=flat-square&label=CI" /></a>
<a href="https://github.com/ernstbe/trudesk-ernstbe/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-APACHE%202-green.svg?style=flat-square" /></a>
</p>

> Modernized fork of [Trudesk](https://github.com/polonel/trudesk) with upgraded dependencies, improved test coverage, and Docker-first deployment.

### What's changed in this fork

- **MongoDB 8 & Mongoose 8** — upgraded from legacy versions
- **Elasticsearch 8.19** — with MongoDB fallback when ES is unavailable
- **React 18** — migrated from React 17 (`createRoot` API)
- **Security updates** — Express, Axios, jsonwebtoken, sanitize-html, socket.io, webpack, and more
- **Server-side i18n** — email subjects translated via i18next (EN/DE)
- **Swagger/OpenAPI** — REST API documentation at `/apidoc`
- **CI pipeline** — GitHub Actions with lint and test stages
- **Expanded test suite** — 89 tests covering models, API endpoints, and i18n

### Requirements

- Node.js 20+
- MongoDB 8.0+
- Elasticsearch 8 (optional — search falls back to MongoDB)

### Quick Start

#### Docker Compose (recommended)

```bash
cp .env.example .env
# Edit .env with your settings (see comments in .env.example)
docker compose up -d
```

This starts Trudesk, MongoDB 8, and Elasticsearch 8 together. The app is available at `http://localhost:8118`.

#### Manual Setup

```bash
npm install --legacy-peer-deps
npm run build
npm start
```

On first run, Trudesk opens a setup wizard at `http://localhost:8118` to configure the database connection and admin account.

### Development

```bash
# Watch mode for frontend
npm run webpackwatch

# Run tests (uses in-memory MongoDB — no external DB needed)
npm test

# Lint
npm run lint
```

### Environment Variables

All configuration is done via environment variables or a `.env` file. See [`.env.example`](.env.example) for a full reference with descriptions covering:

- General settings (port, site URL)
- MongoDB connection (URI, auth, replica sets)
- Elasticsearch connection
- Rate limiting and caching

### API Documentation

Interactive Swagger UI is available at `/apidoc` when the server is running. The OpenAPI spec covers tickets, groups, users, settings, and more.

### Project Structure

```
src/
  controllers/    # Express route handlers (API v1 & v2)
  models/         # Mongoose schemas (ticket, user, group, etc.)
  client/         # React frontend (islands architecture)
  views/          # Handlebars server-rendered templates
  settings/       # App defaults and configuration
  i18n/           # Translation resources (EN, DE)
test/
  0_database.js   # Global test setup (in-memory MongoDB)
  models/         # Model unit tests
  api/            # API endpoint tests
  source/         # Utility tests (i18n, etc.)
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Run tests (`npm test`) and lint (`npm run lint`)
4. Open a pull request against `master`

### License

    Copyright 2014-2023 Trudesk, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
