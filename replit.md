# eDAHouse - E-commerce Food Delivery System

## Overview

This is a comprehensive e-commerce food delivery system built with React, Express.js, and PostgreSQL. The application supports multi-language functionality (Russian, English, Hebrew) with RTL layout support, role-based access control, and a complete admin dashboard for managing products, orders, and store settings.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **State Management**: TanStack React Query for server state, Zustand for cart management
- **Routing**: Wouter for client-side routing
- **UI Components**: Radix UI primitives with custom styling system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Internationalization**: React i18next with support for RTL languages

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Local strategy with bcrypt for password hashing
- **Session Management**: PostgreSQL-based session storage
- **File Upload**: Multer for image handling
- **API**: RESTful API with structured error handling

### Data Storage Solutions
- **Primary Database**: PostgreSQL with optimized schemas
- **Session Storage**: PostgreSQL sessions table
- **File Storage**: Local filesystem for uploaded images
- **Caching**: In-memory caching for store settings and translations

## Key Components

### Authentication & Authorization
- Role-based access control (admin, worker, customer)
- Secure password hashing with bcrypt
- Session-based authentication with PostgreSQL storage
- Password reset functionality with secure tokens

### E-commerce Features
- Product catalog with categories and search
- Shopping cart with persistent storage
- Order management with multiple status tracking
- Delivery scheduling with configurable time slots
- Payment method selection and fee calculation

### Admin Dashboard
- Complete product and category management
- Order tracking with kanban-style interface
- User management with role assignments
- Store settings configuration
- Theme customization system
- Multi-language content management

### Multi-language Support
- Dynamic language switching (Russian, English, Hebrew)
- RTL layout support for Hebrew
- Localized number formatting and currency display
- Admin-configurable store information in multiple languages

## Data Flow

### Order Processing Flow
1. Customer browses products by category
2. Products added to cart with quantity calculation
3. Checkout process with delivery information
4. Order creation and admin notification
5. Admin processes order through status pipeline
6. Customer receives updates via WhatsApp integration

### Admin Management Flow
1. Admin logs in with elevated permissions
2. Manages products, categories, and pricing
3. Processes orders through kanban interface
4. Configures store settings and themes
5. Monitors user activity and permissions

### Authentication Flow
1. User registration/login with validation
2. Session creation and persistence
3. Role-based route protection
4. Automatic session refresh and cleanup

## External Dependencies

### Core Dependencies
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe database operations
- **@radix-ui/react-***: Accessible UI components
- **react-hook-form**: Form validation and handling
- **zod**: Schema validation
- **bcryptjs**: Password hashing
- **multer**: File upload handling

### UI & Styling
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **@hookform/resolvers**: Form validation integration
- **lucide-react**: Icon library

### Internationalization
- **react-i18next**: Translation framework
- **date-fns**: Date formatting with locale support

## Deployment Strategy

### Production Setup
- Node.js 18+ runtime environment
- PostgreSQL 13+ database server
- PM2 process management for multiple instances
- Nginx reverse proxy for load balancing
- SSL certificate management

### Multi-site Configuration
- Separate database per site instance
- Unique port assignment per instance
- Individual PM2 application configuration
- Domain-specific environment variables

### Auto-update System
- Safe migration scripts with database backups
- User data preservation during updates
- Health check verification post-deployment
- Rollback capabilities with version control

### Security Considerations
- Environment variable configuration
- Session secret randomization
- File upload validation and limits
- SQL injection prevention with parameterized queries
- XSS protection with input sanitization

## Changelog

- June 27, 2025: Completed admin panel settings reorganization and theme management integration
  - Moved banner button settings (text and link) from store display settings to theme management 
  - Added banner button fields to themes database schema with proper defaults
  - Integrated ModernStyleSettings component for modern header style info block configuration
  - Added 6 new database fields for modern style info blocks (icon and text for each of 3 blocks)
  - Removed duplicate settings from store settings form to eliminate redundancy
  - Enhanced theme activation to sync banner buttons and modern blocks with store settings
  - Created reusable ModernStyleSettings component with proper icon selection and responsive layout
  - Updated ModernStyleSettings layout: 3 blocks in one row on desktop/tablet, vertical stacking within each block
  - Settings now properly organized: basic store info in settings, styling controls in theme management
- June 27, 2025: Completed adaptive info blocks system for modern header style
  - Added database fields for 3 customizable info blocks (modernBlock1Text/Icon, etc.)
  - Integrated icon selection and text configuration in admin panel theme settings
  - Implemented responsive grid layout (1 column mobile, 2 tablet, 3 desktop)
  - Applied theme color integration for icon backgrounds using CSS variables
  - Replaced emoji icons with Lucide React icons for professional appearance
  - Added full-screen mobile banner height with h-dvh for proper viewport handling
  - Enhanced typography scaling for mobile readability (text-5xl headers, text-lg descriptions)
  - Implemented gradient overlay (lighter top, darker bottom) for improved contrast
- June 27, 2025: Fixed header style synchronization between admin and public views
  - Added headerStyle field to store_settings table for public access
  - Updated HeaderVariant to use headerStyle from public settings instead of admin themes
  - Fixed issue where mobile users couldn't see selected header style due to authentication barriers
  - Implemented automatic synchronization when admin changes header style in theme settings
  - All users now see consistent header design regardless of authentication status
- June 27, 2025: Completed mobile-optimized header banner system with decorative elements
  - Optimized all header styles for mobile devices with responsive height and text sizing
  - Added elegant decorative vignettes to all header styles for enhanced visual appeal
  - Fixed text readability with proper contrast ratios and shadow effects
  - Modern style: 85% background overlay with geometric vignette
  - Classic style: optimized glass card with dotted decorative elements
  - Minimal style: responsive sizing with theme-colored accent elements
- June 27, 2025: Completed full-width modern header banner system
  - Redesigned all three header styles (classic, modern, minimal) with full-width banners
  - Classic: gradient overlay with theme color + glass effect card + smooth zoom animation
  - Modern: dark overlay with centered content + moderate text sizing
  - Minimal: white overlay with dark readable text + floating animation
  - Removed container restrictions and rounded corners for modern edge-to-edge design
  - Eliminated CTA buttons from headers to focus on brand presentation
  - All headers now properly responsive and visually impactful without excessive height
- June 27, 2025: Added header style variants system to theme management
  - Added headerStyle field to themes database schema with 'classic', 'modern', 'minimal' options
  - Created HeaderVariant component with three distinct header layout styles
  - Integrated header style selection into admin theme management interface
  - Maintained backward compatibility with existing classic design as default
  - User requested to keep original design, so main page uses classic InfoBlocks layout
- June 27, 2025: Fixed navigation menu hover color integration with theme system
  - Resolved issue where navigation menu hover effects used hardcoded orange color
  - Added Tailwind CSS variable updates (--primary, --primary-foreground) to theme application
  - Fixed theme-manager.tsx to update both custom CSS and Tailwind variables on theme changes
  - Updated applyTheme function in theme-system.ts for complete Tailwind integration
  - Navigation menu now uses theme-configured primary color for hover states
- June 27, 2025: Optimized theme management system interface
  - Completed comprehensive audit of all theme settings and their actual usage
  - Streamlined admin interface by hiding 8-10 unused color settings from UI
  - Added informative descriptions for each color category explaining their purpose
  - Maintained API compatibility by keeping unused settings as hidden form fields
  - Verified all active theme settings properly apply to website elements
  - Created THEME_AUDIT_REPORT.md documenting which settings impact the interface
- June 26, 2025: Completed systematic elimination of hardcoded text in admin panel
  - Replaced all UI hardcoded Russian text with translation functions
  - Added comprehensive translations for admin settings sections in 3 languages
  - Fixed RTL alignment issues for Hebrew interface (icons and arrows positioning)
  - Resolved JSON syntax errors in translation files
- June 23, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.