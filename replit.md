# eDAHouse - E-commerce Food Delivery System

## Overview
eDAHouse is a comprehensive, multi-language e-commerce food delivery system supporting Russian, English, Hebrew, and Arabic, with RTL layout compatibility. It features robust role-based access control, a complete admin dashboard for product, order, and store management, and aims to deliver a seamless user experience. The project is designed for high market potential through its localized and feature-rich platform, providing advanced capabilities such as configurable delivery scheduling, dynamic delivery fee calculation, and comprehensive SEO optimization.

## User Preferences
Preferred communication style: Simple, everyday language.
Translation management: Always ensure all changes are applied to all 4 languages (Russian, English, Hebrew, Arabic) when working with translations. User expects consistent coverage across all supported languages.
Workflow: Before making ANY code changes, always explain the understanding of the problem and the plan of action, then ask "правильно понял?" and wait for confirmation. Only proceed after user says yes.
Migration file sync (CRITICAL): Whenever shared/schema.ts is modified (new table, new column, ALTER, index, etc.), ALWAYS update migration_full.sql in the project root in the same task — without waiting for user reminder. Use ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS so the file stays idempotent and safe to run on any existing database.

## RTL Architecture Notes (Critical)
- **Admin products table RTL**: Column order is controlled by JS `isRTL` flag in `admin-dashboard.tsx`. `isRTL=true` → RTL branch renders [Status, Price, Category, Name] DOM order. CSS `direction: ltr !important` on `.products-container .table-container table` ensures visual left-to-right display so Status appears leftmost.
- **isRTL detection**: Uses `useState` initialized from `document.documentElement.lang || localStorage.getItem('language')` + listens to both `window.languageChanged` and `i18n.languageChanged` events. DO NOT rely solely on `i18n.language` — it may not be reactive on first render.
- **CSS specificity trap**: Arabic and Hebrew MUST have identical CSS rules for the products table. Never add asymmetric `direction:` rules for one language but not the other. The bug was: Hebrew got `direction: ltr !important` but Arabic got `direction: rtl !important` on `.products-container .table-container table` (index.css ~line 780).
- **All RTL CSS is inside `@layer base`** (index.css line 250). The `html[lang="ar"] .products-container .table-container table` rule has highest specificity (0,3,2) and controls the table direction.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: TanStack React Query (server state), Zustand (cart management)
- **Routing**: Wouter, enhanced with UTM-aware navigation for SEO and analytics
- **UI Components**: Radix UI primitives with custom styling
- **Styling**: Tailwind CSS with custom CSS variables for thematic consistency.
- **Internationalization**: React i18next with RTL support. All textual elements must use translation keys and be available in all four languages.
- **SEO Optimization**: React-helmet-async for dynamic meta tags, and `UTMLink` components for SEO-friendly anchor links with UTM parameter preservation.
- **PWA Functionality**: Service Worker for caching, intelligent install prompts, offline capabilities, and automated version management for seamless updates.
- **Push Notifications**: Integrated system with subscription management and marketing capabilities.

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Local strategy; new passwords use scrypt, existing bcrypt hashes remain supported. Password changes atomically revoke the affected user's PostgreSQL sessions in connect-pg-simple's `session` table (not the unused `sessions` schema declaration). Versioned Passport identities also reject stale sessions recreated by in-flight requests.
- **File Upload**: Multer for image handling, storing files locally.
- **API**: RESTful API with structured error handling.
- **Route Structure**: Modularized routes for system, authentication, user profiles, catalog, orders, administration (users, orders, settings, themes, analytics, push), and integrations (feeds, translations, barcode).
- **Security**: Rate limiting on critical endpoints and secure cookie configuration.
- **Password recovery email**: Uses the existing store SMTP/SendGrid settings and configured sender, independent of the order-alert toggle. Credential links use `REPLIT_APP_URL` or the first HTTPS `ALLOWED_ORIGINS` entry; Replit development can use its runtime dev domain. Never use request headers or a fallback shop domain for reset links. Missing trusted-origin configuration fails privately and logs a redacted delivery error.

### Key Features
- **Authentication & Authorization**: Role-based access control (admin, worker, customer).
- **E-commerce**: Product catalog, persistent shopping cart, multi-status order management, configurable delivery scheduling with per-day delivery hours independent from store working hours, dynamic delivery fee calculation.
- **Admin Dashboard**: Comprehensive management for products, categories, orders (kanban-style), users, store settings, and multi-language content.
- **Multi-Branch Support**: Full multi-branch system controlled by `BRANCHES_ENABLED` env var and `MAX_BRANCHES` env var (integer, limits how many branches can be created; if exceeded on login — admin sees selection modal to delete extras, worker sees blocking screen until admin resolves it). Customers see branch selection modal on first visit (when >1 active branch); selected branch persists in localStorage. Branch indicator in header (single, responsive, right-side) lets customers switch. BranchSelectionModal shows button tiles for ≤3 branches and a dropdown for >3 branches. Branches have multilingual names (name/name_en/name_he/name_ar) supported by getLocalizedField. Product/category catalog filtered by selected branch. Orders include branchId. Admin/worker full management via `/api/admin/branches`. Public catalog branch filter via `GET /api/branches`. Key files: `client/src/hooks/useBranch.tsx`, `client/src/components/BranchSelectionModal.tsx`.
- **Multi-language Support**: Dynamic language switching with RTL support, localized formatting, admin-configurable content, and URL parameter-based language selection.
- **Automatic Updates**: Transparent, automatic update system with cache busting.
- **Image Handling**: Multilingual image system for logos and banners.
- **UI/UX**: Responsive design, mobile-first considerations, consistent styling, and accessible UI components.
- **SEO**: Dynamic meta tag management, crawlable links via UTMLink components, structured data, and hreflang tags.

## Type checks and regression tests
### Paid-order email queue
- Apply `migrations/0008_payment_email_outbox.sql` (or the matching additive block in `migration_full.sql`) to each external store database **before** deploying this server version. Do not use a broad schema push or an automatic startup migration. Existing orders are not backfilled because their prior email delivery is unknown.
- Apply `migrations/0009_payment_provider_approval.sql` before deploying the Grow approval-aware handlers. The additive columns separate order completion from provider confirmation and preserve the initiation-time J5 mode for new payments. Legacy approval state remains unknown; a successful Grow webhook can retry approval without recreating its order. Verify older already-approved transactions with Grow before replaying historical notifications.
- Paid-order administrator and guest messages are committed separately in the same transaction as the order. The worker starts with the server and polls every 5 seconds. Eligibility and recipient are fixed at checkout; current store SMTP/SendGrid settings and existing templates are reused. Turning off new order notifications does not cancel already queued messages.
- Each delivery holds a PostgreSQL row lock through sending and recording success (`FOR UPDATE SKIP LOCKED`). Other processes skip locked rows. Process death rolls back the delivery transaction and releases the lock. This uses a database connection during sending; keep worker concurrency low.
- Failed transport results (including `false`) retry up to 8 times: 30 seconds, 1 minute, 2 minutes, etc., capped at 1 hour. Exhausted messages remain `failed` with a redacted diagnostic; they are not deleted. Inspect queue counts with `SELECT status, count(*) FROM payment_email_outbox GROUP BY status`.
- After fixing mail configuration, an operator can explicitly retry a **specific** failed row: `UPDATE payment_email_outbox SET status = 'pending', attempts = 0, available_at = now(), last_error = NULL WHERE id = <reviewed_id> AND status = 'failed'`. Never reset `sent` rows or bulk replay historical orders.
- Delivery is at-least-once, not guaranteed exactly-once: provider acceptance followed by process/connection loss before the success commit can cause a duplicate. Existing SMTP/SendGrid transports do not offer a deduplication guarantee. Also, provider acceptance is not proof of inbox delivery.
- `npm run test:payments` uses only a disposable UTF-8 PostgreSQL cluster. It covers callback races, atomic outbox insertion, transport errors/backoff/exhaustion, slow competing workers, real process death after commit and while holding a row lock, and recovery in a fresh process.

- `npm run check` runs three independent strict checks: `check:app` (the unchanged application configuration), `check:tests` (tests and TypeScript scripts, including application-adjacent `*.test.ts`/`*.test.tsx` files), and `check:build` (the two Vite configurations, service-worker Vite plugin, Drizzle configuration, and Tailwind configuration).
- `check:build` uses `tsconfig.build.json` with explicit root files and no output. It only checks types: it does not execute configuration code, build assets, update the service worker, or connect to a database. It needs no database credentials.
- `npm run test:typecheck` verifies the independent root scopes and proves that deliberately invalid test/script fixtures and isolated copies of all five build roots make their respective checks exit nonzero. The build copies also contain runtime traps and are checked without database settings to guard against configuration execution. Run it sequentially with other type checks: it temporarily creates invalid test/script fixtures and removes them in `finally`.
- Post-merge setup runs all three type checks and this regression test before security tests and the build. Test and build configurations inherit application strictness without changing the application configuration.

## External Dependencies
- **@tanstack/react-query**: Server state management.
- **drizzle-orm**: Type-safe ORM for PostgreSQL.
- **@radix-ui/react-***: Accessible UI component primitives.
- **react-hook-form**: Form validation and handling.
- **zod**: Schema validation.
- **bcryptjs**: Password hashing.
- **multer**: File upload middleware.
- **tailwindcss**: CSS framework.
- **react-i18next**: Internationalization framework.
- **date-fns**: Date utility library.
- **pg**: PostgreSQL client.
- **@neondatabase/serverless**: Neon Database integration.
- **pm2**: Node.js process manager.
- **Nginx**: Reverse proxy.
- **dotenv**: Environment variable management.
- **connect-pg-simple**: PostgreSQL session store.
- **react-helmet-async**: SSR-compatible SEO meta tag management.