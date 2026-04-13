# eDAHouse - E-commerce Food Delivery System

## Overview
eDAHouse is a comprehensive, multi-language e-commerce food delivery system supporting Russian, English, Hebrew, and Arabic, with RTL layout compatibility. It features robust role-based access control, a complete admin dashboard for product, order, and store management, and aims to deliver a seamless user experience. The project is designed for high market potential through its localized and feature-rich platform, providing advanced capabilities such as configurable delivery scheduling, dynamic delivery fee calculation, and comprehensive SEO optimization.

## User Preferences
Preferred communication style: Simple, everyday language.
Translation management: Always ensure all changes are applied to all 4 languages (Russian, English, Hebrew, Arabic) when working with translations. User expects consistent coverage across all supported languages.

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
- **Authentication**: Local strategy with bcrypt and PostgreSQL-based session storage.
- **File Upload**: Multer for image handling, storing files locally.
- **API**: RESTful API with structured error handling.
- **Route Structure**: Modularized routes for system, authentication, user profiles, catalog, orders, administration (users, orders, settings, themes, analytics, push), and integrations (feeds, translations, barcode).
- **Security**: Rate limiting on critical endpoints and secure cookie configuration.

### Key Features
- **Authentication & Authorization**: Role-based access control (admin, worker, customer).
- **E-commerce**: Product catalog, persistent shopping cart, multi-status order management, configurable delivery scheduling with per-day delivery hours independent from store working hours, dynamic delivery fee calculation.
- **Admin Dashboard**: Comprehensive management for products, categories, orders (kanban-style), users, store settings, and multi-language content.
- **Multi-Branch Support**: Full multi-branch system controlled by `BRANCHES_ENABLED` env var. Customers see branch selection modal on first visit (when >1 active branch); selected branch persists in localStorage. Branch indicator in header lets customers switch. Product/category catalog filtered by selected branch. Orders include branchId. Admin/worker full management via `/api/admin/branches`. Public catalog branch filter via `GET /api/branches`. Key files: `client/src/hooks/useBranch.tsx`, `client/src/components/BranchSelectionModal.tsx`.
- **Multi-language Support**: Dynamic language switching with RTL support, localized formatting, admin-configurable content, and URL parameter-based language selection.
- **Automatic Updates**: Transparent, automatic update system with cache busting.
- **Image Handling**: Multilingual image system for logos and banners.
- **UI/UX**: Responsive design, mobile-first considerations, consistent styling, and accessible UI components.
- **SEO**: Dynamic meta tag management, crawlable links via UTMLink components, structured data, and hreflang tags.

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