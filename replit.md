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

### Recent Critical Updates (August 2025)
- **VPS Database Synchronization COMPLETED**: Successfully resolved major database schema mismatch between local and VPS environments. Added 32 missing slider columns to VPS database (33 total), fixing critical slider functionality error "Failed to execute 'text' on 'Response': body stream already read".
- **PM2 Process Configuration Fixed**: Corrected VPS deployment process to use `dist/index.js` with proper startup commands.
- **Production Deployment Stabilized**: VPS slider functionality now fully operational after database migration.
- **Project Cleanup Attempted & Reverted (August 11)**: Attempted comprehensive cleanup but accidentally removed essential files. Full project restored from backup `backups/complete_backup_20250811_183249/`.

### Key Features
- **Authentication & Authorization**: Role-based access control (admin, worker, customer) with secure password hashing and session management.
- **E-commerce Features**: Product catalog with search and categories, persistent shopping cart, multi-status order management, configurable delivery scheduling, and payment selection. Dynamic delivery fee calculation based on store settings.
- **Admin Dashboard**: Comprehensive management for products, categories, orders (kanban-style), users, store settings, and theme customization. Includes multi-language content management. **Slider banner functionality now fully operational on VPS**.
- **Multi-language Support**: Dynamic language switching (Russian, English, Hebrew, Arabic) with RTL layout support, localized formatting, and admin-configurable content. Implemented a dual multilingual system: public website uses fallback to default language, while admin panel shows empty fields for missing translations.
- **Automatic Updates**: Transparent, fully automatic update system with cache busting for seamless user experience, including specific aggressive cache clearing for iOS devices.
- **Image Handling**: Multilingual image system for logos and banners, ensuring proper display across all languages.
- **UI/UX Decisions**: Emphasis on responsive design, compact layouts for mobile, consistent styling with thematic classes, accessible UI components from Radix UI, and streamlined user flows. Product grids are limited to a maximum of 3 columns. Radix UI scroll-lock functionality is completely disabled.
- **PWA Functionality**: Full Progressive Web App implementation including Service Worker for caching, smart install prompts, offline capabilities, and manifest configuration.
- **Push Notifications**: Fully operational push notification system with subscription management, marketing notification capabilities, and a user-facing modal for displaying content.
- **SEO Optimization**: Basic SEO with dynamic meta tags for titles, descriptions, and keywords, supporting multilingual content.

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