# eDAHouse - E-commerce Food Delivery System

## Overview

eDAHouse is a comprehensive e-commerce food delivery system designed for multi-language support (Russian, English, Hebrew, Arabic) with RTL layout compatibility. It features robust role-based access control and a complete admin dashboard for managing products, orders, and store settings. The project aims to provide a seamless and intuitive experience for both customers and administrators in a global market, with ambitions for high market potential through its localized and feature-rich platform.

## User Preferences

Preferred communication style: Simple, everyday language.
Translation management: Always ensure all changes are applied to all 4 languages (Russian, English, Hebrew, Arabic) when working with translations. User expects consistent coverage across all supported languages.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **State Management**: TanStack React Query for server state, Zustand for cart management
- **Routing**: Wouter for client-side routing
- **Navigation System with UTM Preservation & SEO Optimization**: 
  - **CRITICAL**: Always use UTM-aware navigation components to preserve advertising attribution parameters AND ensure SEO-friendly anchor links
  - **For links with Button styling**: Use `<Button asChild><UTMLink href="...">{content}</UTMLink></Button>` pattern (Button must wrap UTMLink as direct child)
  - **For plain links**: Use `UTMLink` from `@/components/UTMLink` instead of wouter's `Link`
  - **For programmatic navigation**: Use `useUTMNavigate()` from `@/hooks/use-utm-navigate` instead of wouter's `useLocation`
  - System automatically preserves UTM parameters (utm_source, utm_medium, utm_campaign, utm_term, utm_content) and tracking IDs (fbclid, gclid, yclid) across all navigation
  - Parameters stored in localStorage for 30 days and automatically attached to analytics events
  - **SEO Benefits**: All UTMLink components render proper <a href> tags visible to search engine crawlers while maintaining SPA navigation via wouter Link
  - **Browser UX**: Users see URL preview on hover, can Ctrl+Click to open in new tab, and access right-click context menu
  - Implementation files: `client/src/hooks/use-utm-params.tsx`, `client/src/hooks/use-utm-navigate.tsx`, `client/src/components/UTMLink.tsx`
  - When adding new pages: Always use UTMLink/useUTMNavigate to maintain parameter preservation AND SEO discoverability throughout user journey
- **UI Components**: Radix UI primitives with custom styling system
- **Styling**: Tailwind CSS with custom CSS variables for theming. Strict rules for color styles: always use thematic classes, manage colors via `/client/src/lib/design-system.css`, and create CSS variables for new colors.
- **Internationalization**: React i18next with support for RTL languages (Hebrew, Arabic). All textual elements must use translation keys and be available in all four languages. RTL compatibility must be checked for UI changes.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Local strategy with bcrypt for password hashing and PostgreSQL-based session storage.
- **File Upload**: Multer for image handling, with local filesystem storage.
- **API**: RESTful API with structured error handling.
- **Data Flow**: Defined flows for order processing (browsing, cart, checkout, admin processing), admin management (product, order, user, store settings, theme configuration), and authentication (registration, login, session management, role-based protection).

### Recent Critical Updates
- **November 2025 - Complete SEO Navigation Overhaul (COMPLETED)**: Migrated all navigation from onClick handlers to proper SEO-friendly anchor links using UTMLink component with Button asChild pattern. Replaced ALL Button onClick navigation across 6 components (CategoryNav, Sidebar, ProductCard, Checkout, Home page, Auth page) with `<Button asChild><UTMLink href="...">{content}</UTMLink></Button>` pattern. This ensures: (1) Crawlers can discover all links via <a href> tags, (2) Browser features work (URL preview on hover, Ctrl+Click for new tabs, right-click context menu), (3) SPA navigation preserved via wouter Link, (4) UTM parameters tracked throughout journey, (5) Styling and state management maintained through Radix UI's asChild composition pattern. **Navigation components affected**: CategoryNav mobile/desktop navigation, Sidebar category links, ProductCard category badges, Checkout back buttons, Home page "All Products" button + category cards. **Key pattern**: Button must receive anchor as direct child when using asChild - `Button.asChild > UTMLink` NOT `UTMLink > Button.asChild`.
- **November 2025 - SEO Helmet Migration (In Progress)**: Migrated SEO meta tag management from direct DOM manipulation to react-helmet-async for better SSR compatibility and cleaner code. SEOHead.tsx completely refactored to use Helmet components, HelmetProvider added to App.tsx, all browser-only APIs (localStorage, window) now have SSR-safe checks. Created SSR infrastructure files (entry-server.tsx, bot-detection.ts, ssr-middleware.ts, meta-injection-middleware.ts) but full Hybrid SSR not yet implemented due to Vite configuration constraints. Current state: static meta tags in index.html work for bots, dynamic Helmet tags work for users during SPA navigation.
- **November 2025 - PWA Install & Push Notification UX Overhaul (Critical)**: Completely redesigned prompt system for optimal user experience and browser compatibility. **PWA Install Prompt**: Now disabled on desktop devices (mobile-only), requires minimum 2-3 visits, 7-day repeat interval, proper localStorage validation. **Push Notification Request**: Increased delay to 30 seconds (from 5s), 3-day repeat interval (from 1 day), contextual triggers after cart additions and checkout completion, mutual exclusion with PWA prompt to prevent simultaneous prompts. Created centralized utility library (`client/src/lib/prompt-utils.ts`) for visit tracking, device detection, prompt coordination, and timing controls. Added critical Notification API guards for browser compatibility, preventing crashes on unsupported platforms like older iOS Safari versions. All prompts now respect user journey and engagement patterns.
- **November 2025 - Automatic PWA Version Management (Critical)**: Implemented automated Service Worker versioning system to eliminate white screen issues after deployments. Created `scripts/update-sw-version.js` that automatically updates BUILD_TIMESTAMP in Service Worker before each build, ensuring every deployment gets unique version number. This forces automatic cache refresh for all users without manual intervention. System includes: (1) Automated timestamp updater script, (2) Deploy script (`scripts/deploy.sh`) that runs updater before build, (3) skipWaiting + clients.claim in SW, (4) controllerchange auto-reload listener in usePWA.ts, (5) Versioned cache clearing on activation. **VPS Deploy Process**: Run `node scripts/update-sw-version.js && npm run build` or use `./scripts/deploy.sh` for full automated deployment. Users receive updates automatically within minutes without seeing white screens or needing manual cache clearing.
- **October 2025 - UTM Parameter Preservation System**: Implemented comprehensive system for preserving advertising attribution parameters (UTM, fbclid, gclid, yclid) throughout user journey. Created UTMLink component and useUTMNavigate hook as mandatory replacements for wouter's standard navigation. All existing navigation updated to use UTM-aware components. Parameters stored in localStorage for 30 days and automatically integrated with all analytics platforms (Yandex Metrica, Facebook Pixel, Google Analytics).
- **October 2025 - Delivery Time Mode Feature**: Implemented flexible delivery time selection system with three modes: hours-based (2-hour intervals from working hours), half-day (first/second half of day), and disabled (no time selection). Feature includes full multilingual support across all 4 languages and integration with checkout flow, admin panel, and order displays.
- **August 2025 - VPS Database Synchronization COMPLETED**: Successfully resolved major database schema mismatch between local and VPS environments. Added 32 missing slider columns to VPS database (33 total), fixing critical slider functionality error "Failed to execute 'text' on 'Response': body stream already read".
- **August 2025 - PM2 Process Configuration Fixed**: Corrected VPS deployment process to use `dist/index.js` with proper startup commands.
- **August 2025 - Production Deployment Stabilized**: VPS slider functionality now fully operational after database migration.

### Key Features
- **Authentication & Authorization**: Role-based access control (admin, worker, customer) with secure password hashing and session management.
- **E-commerce Features**: Product catalog with search and categories, persistent shopping cart, multi-status order management, configurable delivery scheduling, and payment selection. Dynamic delivery fee calculation based on store settings.
- **Admin Dashboard**: Comprehensive management for products, categories, orders (kanban-style), users, store settings, and theme customization. Includes multi-language content management. **Slider banner functionality now fully operational on VPS**.
- **Multi-language Support**: Dynamic language switching (Russian, English, Hebrew, Arabic) with RTL layout support, localized formatting, and admin-configurable content. Implemented a dual multilingual system: public website uses fallback to default language, while admin panel shows empty fields for missing translations. **URL Parameter Language Switching**: Users can share language-specific links using URL parameters (e.g., ?lang=he for Hebrew, ?lang=ru for Russian) - system respects admin panel language enablement settings and blocks switching to disabled languages.
- **Automatic Updates**: Transparent, fully automatic update system with cache busting for seamless user experience, including specific aggressive cache clearing for iOS devices.
- **Image Handling**: Multilingual image system for logos and banners, ensuring proper display across all languages.
- **UI/UX Decisions**: Emphasis on responsive design, compact layouts for mobile, consistent styling with thematic classes, accessible UI components from Radix UI, and streamlined user flows. Product grids are limited to a maximum of 3 columns. Radix UI scroll-lock functionality is completely disabled.
- **PWA Functionality**: Full Progressive Web App implementation including Service Worker for caching, smart install prompts, offline capabilities, and manifest configuration.
- **Push Notifications**: Fully operational push notification system with subscription management, marketing notification capabilities, and a user-facing modal for displaying content.
- **SEO Optimization**: Comprehensive SEO implementation with react-helmet-async for dynamic meta tag management AND complete SEO-friendly navigation system. Features include: (1) All navigation links use proper <a href> tags visible to crawlers via UTMLink components with Button asChild pattern, (2) Static meta tags in index.html for initial bot indexing, (3) Dynamic meta tags via Helmet for SPA navigation, (4) og:image/twitter:image with fallbacks, (5) hreflang tags for 4 languages with query preservation, (6) GEO metadata, (7) Product/BreadcrumbList structured data, (8) Crawlable links throughout entire site (CategoryNav, Sidebar, ProductCard, Home page category cards, All Products button, Checkout back buttons). SSR infrastructure created (entry-server.tsx, bot-detection.ts) but not yet fully implemented due to Vite configuration constraints. **SEO Pattern**: `<Button asChild><UTMLink href="...">` ensures Button styling + SEO discoverability + SPA performance.

## External Dependencies

- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe database operations
- **@radix-ui/react-***: Accessible UI components
- **react-hook-form**: Form validation and handling
- **zod**: Schema validation
- **bcryptjs**: Password hashing
- **multer**: File upload handling
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **@hookform/resolvers**: Form validation integration
- **lucide-react**: Icon library
- **react-i18next**: Translation framework
- **date-fns**: Date formatting with locale support
- **pg**: PostgreSQL client library
- **@neondatabase/serverless**: Neon Database support (conditional import based on environment)
- **pm2**: Process management for Node.js applications
- **Nginx**: Reverse proxy for load balancing and SSL termination
- **dotenv**: Environment variable management
- **connect-pg-simple**: PostgreSQL session storage
- **react-helmet-async**: SSR-compatible meta tag management for SEO