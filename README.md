# StackNova

PHP application with a SQLite database, preserving the original responsive design.

## Local XAMPP

- URL: `http://localhost/StackNova/`
- PHP CLI and Apache must both enable `pdo_sqlite`.
- `config.local.php` is for local XAMPP only. There are no seeded users or shared passwords.
- Initialize/update the local database with `php tools/migrate.php`.
- Register an account through the page. Estimates and chat created as a guest during that session are attached to the account on registration/login.
- Application database: `storage/stacknova.sqlite`. Never download or copy an active SQLite database directly; use the snapshot command below.

## Responsibilities

- `index.html`: original design/markup source. Its historical inline script is not executed by the deployed page. Do not open this source file as the application.
- `tools/build_view.py`: generates `views/home.html` and `assets/theme.css`, excluding the original inline script and Tailwind CDN.
- `assets/app.js`: maintained client application, talking only to same-origin APIs.
- `index.php`: page controller and security headers.
- `api.php`: routing, request validation and error boundary.
- `src/Auth.php`, `Session.php`, `Estimates.php`, `Chat.php`: services.
- `src/Repository.php`: prepared database access and transactional rate limits.
- `migrations/`: ordered, forward-only schema migrations.
- `storage/`: private local runtime state, not a deployment asset.

## Build

Requires Node/npm and Python for the development build only. PHP serves the compiled assets without Node or Python.

```powershell
npm ci --ignore-scripts
npm run build
npm run check:js
npm audit --audit-level=low
```

Google Fonts and Unsplash images are remote resources; CSS, JavaScript and the Bootstrap icon font are local. Bootstrap Icons 1.11.3 is MIT licensed; its copyright notice is retained in `assets/icons.css`.

## Tests

Tests must use the disposable `storage/security-test.sqlite`, never the application database. The configured test server is loopback-only at port 8097. The app's development-server configuration is in `.aetox/launch.json`.

Prepare the fixture in a separate PowerShell session (these overrides last for this process only):

```powershell
$env:APP_ENV='test'
$env:APP_ORIGIN='http://127.0.0.1:8097'
$env:APP_BASE_PATH=''
$env:APP_DATABASE='C:\xampp\htdocs\StackNova\storage\security-test.sqlite'
php tools/migrate.php
```

Start the configured `security-test` server from the app. Then run:

```powershell
npm test
npm run test:browser
```

The browser suite uses an installed Google Chrome in headless mode. API tests reset only rate counters on the designated disposable fixture at suite startup; the brute-force test does not bypass or reset counters during its attack. Tests create only synthetic `.test` accounts. The operation test builds a separate temporary database, rehearses migrations twice, snapshots it, exercises retention, and restores the snapshot into a new file.

## Operations

```powershell
php tools/backup.php
php tools/maintenance.php
```

Backup uses SQLite `VACUUM INTO` for a consistent snapshot including committed WAL content. Backups are created beside the configured database in `backups/`. They contain personal data: restrict permissions, encrypt backup storage, define retention, and keep them outside the document root in production. Maintenance purges expired sessions/rate counters, guest data older than 30 days, and accounts inactive for 365 days (including associated rows through foreign-key cascades). Run maintenance daily using the host scheduler. No machine-wide scheduled task has been installed by this project.

For restoration, stop writes, preserve the current database and all WAL files as a rollback set, restore a verified snapshot into a new file, verify SQLite integrity/foreign keys, point `APP_DATABASE` to that new file and start the app. The test suite verifies the new-file restore path, not your hosting provider's disaster recovery.

## API contract

All responses use JSON, private responses are `no-store`. Every mutation requires JSON, an exact configured `Origin`, and `X-CSRF-Token` from `GET api/session`. Authentication rotates both the session cookie and CSRF token.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `api/session` | Current public profile, CSRF token and configured public contacts |
| POST | `api/register` | `{name,email,password}`; 12–72-byte password; creates private account |
| POST | `api/login` | `{email,password}`; generic login errors |
| POST | `api/logout` | `{}`; revokes current session |
| POST | `api/account/delete` | `{password}`; verifies password, removes account and related data |
| GET/POST | `api/estimates` | Own history / `{service,scope,cms}`; server-calculated integer satang |
| GET | `api/estimates/{id}` | Owner-scoped estimate; otherwise 404 |
| GET/POST | `api/chat` | Own recent history / `{message}`; persisted automated guide response |

Chat is a rules-based automated service, not a generative AI or human inbox. No third-party AI key or mail provider is required. Email is an unverified account identifier; there is no email-based verification or recovery flow and no trust/authorization decisions rely on email ownership. No administrator endpoint or staff privileges exist.

## Production deployment

**The current XAMPP runtime is local development, not an approved internet deployment.** The checked PHP CLI is 8.2.12; PHP's release API reports security release 8.2.35 dated 2026-10-21. Update to a current patched, supported runtime before exposure. Do not change the shared machine's Apache/PHP installation as a side effect of deploying this folder.

1. Use a dedicated Apache virtual host with this project as its document root, `mod_rewrite` enabled and `AllowOverride All` for its `.htaccess`. Restrict the host's filesystem permissions. At server level set `ServerTokens Prod` and disable public diagnostic/status endpoints; `.htaccess` already disables version signatures in error pages. Do not deploy using PHP's development server, `file://`, a static host, or a server that ignores these rules.
2. Remove `config.local.php` from the deployment. Supply environment variables through the hosting platform, not a public `.env` file. `APP_ENV=production` is mandatory. The app rejects HTTP in production and ignores forwarded HTTPS headers; terminate TLS at Apache itself or configure the trusted reverse proxy/FastCGI HTTPS parameter at the infrastructure boundary.
3. Set `APP_ORIGIN` to the exact HTTPS origin without a path or trailing slash, e.g. your real `https://...` host. Set `APP_BASE_PATH` separately (empty for the root). Host headers are validated against this origin.
4. Set `APP_DATABASE` to an absolute SQLite file outside the document root on a local disk, with its parent directory writable only by the application identity. Production startup rejects a database inside this project. Use one application host; SQLite WAL is not a shared network-drive or multi-node database design. For a multi-node deployment, migrate persistence to a managed relational database before scaling.
5. Set `BUSINESS_LEGAL_NAME` and a valid `CONTACT_EMAIL` for the controller; production configuration rejects missing values. Set a verified `CONTACT_LINE` (`https://line.me/...`) and/or `CONTACT_PHONE` for the contact buttons. Empty channels show an honest unavailable state.
6. Run `php tools/migrate.php` with exactly the production environment. For upgrades, create and verify a snapshot first. Never run the integration tests against this database.
7. Deploy the built `assets/` and `views/`, PHP controllers and `src/`, `.htaccess`, migration/operation scripts and migrations. Do not publish `node_modules`, tests, test-results, test database, local config or source credentials. All private directories are denied by the Apache rules as defense in depth.
8. Replace labelled example portfolio, statistics, reviews and any business claims with verified content. Confirm pricing, business location, privacy notice, hosting/transfer safeguards, backup retention and controller contact before publication. Do not add fictional AggregateRating structured data.
9. Schedule daily maintenance, protected/encrypted backups, retention and a restore rehearsal. Keep operational logs outside the web root; configure alerts for 5xx, failed authentication, database capacity and abuse. Rate limits use the direct peer IP, not untrusted forwarded headers; review this boundary if using a proxy.
10. Verify HTTPS certificate chain, Secure/HttpOnly/SameSite session cookies, HSTS, CSP, forbidden private files, recovery, monitoring and authorization in the actual deployment. The local tests are not evidence for your TLS, firewall, host patching or alerts.

The code implements the requested backend and database flows. Public deployment still requires real hosting/domain, updated runtime and verified business configuration. This repository does not certify PDPA compliance or guarantee the absence of vulnerabilities.
# stacknovaweb
