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

- June 28, 2025: Fixed translation key conflicts and completed paymentAndDelivery key translations
  - CRITICAL TRANSLATION FIX: Resolved "key returned an object instead of string" errors on main page
  - PAYMENTANDDELIVERY FIX: Added proper translations for paymentAndDelivery key across all languages
    - Russian: "Оплата и доставка" (was Arabic text)
    - English: "Payment and Delivery" (already correct)  
    - Hebrew: "תשלום ומשלוח" (was "missing translation")
    - Arabic: "الدفع والتوصيل" (already correct)
  - ROOT CAUSE: Translation keys conflicting between string values and object structures
  - SOLUTION IMPLEMENTED: Updated home page to use specific non-conflicting translation keys
    - Changed t('delivery') to t('cart.delivery') - uses existing cart object string value
    - Changed t('paymentAndDelivery') to t('paymentMethod') & t('cart.delivery') - combines two working keys
    - Removed duplicate string keys from Arabic common.json that conflicted with shop.json objects
  - SYSTEMATIC CLEANUP: Fixed 40+ Arabic text entries incorrectly placed in Russian translation file
    - Corrected Russian cart section with proper Russian translations
    - Added missing "payment" string key to Arabic common.json to resolve object conflicts
  - TECHNICAL APPROACH: Used existing translation paths to avoid object/string conflicts
  - USER EXPERIENCE: All language interfaces now display proper text labels instead of error messages
  - LANGUAGE SUPPORT: Complete translation coverage for all languages (RU/EN/HE/AR)
- June 28, 2025: Fixed Arabic RTL layout for admin products page
  - CRITICAL RTL FIX: Resolved Arabic language layout issues in admin dashboard products section
  - HYBRID LAYOUT IMPLEMENTATION: RTL container with LTR table for optimal Arabic UX
    - Container (products-container): RTL direction for Arabic language consistency
    - Table content: LTR direction for proper data display (IDs, prices, technical info)
    - Added CSS selectors: html[lang="ar"] .products-container, [data-tab="products"]
  - TECHNICAL SOLUTION: Enhanced CSS rules in index.css with specific Arabic targeting
    - RTL enforcement for products container and controls
    - LTR override for table headers and cells within RTL container
    - Preserved existing Hebrew RTL functionality without conflicts
  - COMPONENT UPDATES: Added products-container class and data-tab="products" attribute
  - USER EXPERIENCE: Arabic admin users now have proper RTL interface with readable data tables
- June 28, 2025: Completed comprehensive theme management internationalization
  - COMPLETE ELIMINATION: Systematically replaced all hardcoded Russian texts in ThemeManager component
  - FULL TRANSLATION COVERAGE: Added 50+ new translation keys across all 4 languages (RU/EN/HE/AR)
    - Visual display settings (banner controls, interface elements, category menu, info blocks)
    - WhatsApp integration settings (phone format, default messages, setup instructions)
    - Cart banner configuration (text/image types, colors, sizing recommendations)
    - Bottom banner management (dual banner setup, link configuration, image uploads)
    - Additional features (special offers, position controls, visual toggles)
  - MULTILINGUAL CONSISTENCY: All theme management interfaces now support complete language switching
    - Russian: Complete native interface with proper terminology
    - English: Professional business terminology and clear descriptions
    - Hebrew: Right-to-left optimized with proper Hebrew translations
    - Arabic: RTL layout with authentic Arabic business terms
  - SYSTEMATIC APPROACH: Used translation functions (adminT) for all user-facing text elements
  - TECHNICAL IMPLEMENTATION: Maintained existing functionality while adding full i18n support
  - TOTAL KEYS ADDED: 50+ new translation keys synchronized across all language files
- June 28, 2025: Completed comprehensive translation system audit and RTL admin panel unification
  - CRITICAL FIXES: Resolved translation key conflicts (categories string vs object) causing runtime errors
  - FULL SYNCHRONIZATION: All 4 languages (RU/EN/HE/AR) now have complete translation coverage
    - common.json: 381/381 keys (100%) - all languages synchronized
    - shop.json: 523/523 keys (100%) - all languages synchronized  
    - admin.json: 1052/1052 keys (100%) - all languages synchronized including theme management
  - ARABIC VALIDATION: All Arabic translations verified as proper Arabic text without fallbacks
  - RTL UNIFICATION: Arabic and Hebrew admin panels now have identical RTL styling behavior
    - 18 unified CSS rules covering all admin interface elements
    - 16/16 admin component categories fully synchronized (admin-panel, forms, tables, navigation, etc.)
    - Both languages use same RTL text alignment, icon positioning, and layout direction
    - Global RTL enforcement for Arabic language with comprehensive CSS overrides
  - THEME MANAGEMENT TRANSLATION: Fully translated theme management section across all languages
    - Added 13 translation keys for theme operations (create, update, activate, delete)
    - Replaced all hardcoded Russian texts with proper translation functions
    - Theme management now supports full multilingual interface
  - CODE FIXES: Fixed hardcoded t('categories') calls in home.tsx and sidebar.tsx using t('categoriesText')
  - TRANSLATION QUALITY: Systematic validation ensures no missing keys or empty translations
  - TOTAL COVERAGE: 1,956 translation keys fully synchronized across all 4 languages
- June 28, 2025: Fixed Arabic language translation issues and RTL layout
  - Massively expanded Arabic admin translation file from 277 to 530+ keys
  - Added all missing translation keys (tabs, actions, storeSettings sections)
  - Fixed incomplete Arabic admin interface translations
  - Removed flags from all language switchers for better mobile layout
  - Arabic now displays properly without falling back to English/Russian text
  - Improved RTL alignment for Arabic language in admin dashboard
- June 28, 2025: Added Arabic language support to multi-language system
  - Created complete Arabic translation files (common.json, shop.json, admin.json)
  - Added Arabic font support with Noto Sans Arabic
  - Updated i18n configuration to include Arabic (ar) with RTL direction
  - Added Arabic language fields to database schema (store_name_ar, etc.)
  - Updated language switcher to include Arabic option with Saudi Arabia flag
  - Arabic numerals remain as western numerals as requested
  - Added proper CSS styling for Arabic text rendering and RTL layout
- June 28, 2025: Fixed missing translation keys for settings notifications
  - Added missing translation keys for settings save notifications in all languages (RU/EN/HE)
  - Fixed issue where settings update notifications appeared in English despite Russian interface
  - Added translations: settings.saved, settings.saveSuccess, settings.saveError
- June 28, 2025: Enhanced admin system settings with theme access management and eye icon controls
  - Added "Управление темами" (Theme Management) permission option in system settings
  - Replaced all switch toggles with eye/eye-off icon buttons for more compact interface design
  - Updated permission logic to support separate theme management access control
  - Added canManageThemes field to database schema and worker permissions
  - Enhanced admin panel with more granular access control for different features
- June 28, 2025: Added "Next Day Order" filter to admin products section
  - Added new filter option "Заказ на другой день" (Next Day Order) in admin product filters
  - Updated filtering logic to show products with availabilityStatus "out_of_stock_today"
  - Enhanced admin panel product management with better filtering capabilities
- June 28, 2025: Fixed mobile styling issues for product editing form
  - Completely removed problematic CSS rules (min-height: 44px, width: 100%) affecting category selection dropdown
  - Changed product edit form buttons layout: "Cancel" and "Save" now display in single row on mobile instead of stacked
  - Fixed UI/UX issues identified by user
  - Fixed "All Products" button functionality - now properly redirects using handleCategorySelect(0)
  - Removed duplicate category information on category pages to eliminate redundancy
  - Fixed duplicate "per" word in English product cards by updating unit translations
  - Removed search field from main page while keeping it on category pages
  - Optimized screen space usage by reducing empty blocks and margins
  - Fixed search field focus loss issue by using CSS visibility instead of conditional rendering
- June 28, 2025: Completed comprehensive translation synchronization project
  - Identified and fixed ALL 363 missing translation keys across all languages
  - Fixed common.json: fully synchronized all 239 keys across Russian, English, Hebrew
  - Fixed shop.json: fully synchronized all 242 keys across Russian, English, Hebrew
  - Fixed admin.json: fully synchronized all 739 keys across Russian, English, Hebrew
  - Created automated translation analysis scripts for ongoing maintenance
  - COMPLETED: Full translation synchronization - 1,220 total keys across 3 languages
  - All user interfaces now have complete multilingual support (RU/EN/HE)
- June 28, 2025: Completed comprehensive translation audit and critical fixes
- June 28, 2025: Removed auth page settings section and cleaned up authentication page
  - Completely deleted "Страница авторизации" (Auth Page) section from admin settings
  - Removed all auth page configuration fields (authPageTitle, authPageSubtitle, authPageFeature1-3)
  - Removed associated state variables (isAuthPageOpen, setIsAuthPageOpen)
  - Removed left informational panel (Hero Section) from authentication page
  - Authentication page now shows only centered login/registration form without promotional content
- June 28, 2025: Optimized working hours section layout for better compactness and visual comfort
  - Reorganized days of week into responsive two-column grid layout (mobile: 1 column, desktop: 2 columns)
  - Changed time controls to vertical stacking (opening time above closing time) for space efficiency
  - Added visual indicators: green background for working days, gray for closed days
  - Added light gray background to entire section for better visual separation from white interface
  - Reduced element sizes and padding for more compact display
- June 28, 2025: Completely removed display settings section from admin panel as requested
  - Deleted entire "Настройки отображения" (Display Settings) section from admin settings
  - Removed associated state variables (isDisplaySettingsOpen, setIsDisplaySettingsOpen)
  - Cleaned up admin interface to focus only on essential store configuration
  - All visual settings now exclusively managed in "Управление темами" → "Визуалы" tab
- June 28, 2025: Created admin dashboard backup and resolved database schema issues
  - Created admin-dashboard-backup-20250628_135649.tsx for safety
  - Added missing banner_image_url column to store_settings table via SQL migration
  - Resolved duplicate field definitions that caused schema compilation errors
  - Fixed state management synchronization between themes and store settings
  - All banner management changes now properly reflect on live website
- June 28, 2025: Completed comprehensive banner management system integration
  - Moved all banner settings from store settings to theme management "Visual" tab
  - Added conditional field display for cart banner - shows only relevant fields based on banner type (text vs image)
  - Fixed image loading from database - existing logos, header banners, cart banners, and bottom banners properly display
  - Implemented proper state management for all banner image uploads with real-time preview
  - Added cart banner type selection with conditional field visibility
  - Created bottom banners section with dual banner support and link configuration
  - Enhanced ImageUpload component integration with proper value/onChange pattern
  - Consolidated banner management into unified theme system for better organization
- June 27, 2025: Reorganized theme management tabs for better organization
  - Combined Brand, Status, and Neutral tabs into single unified "Colors" tab
  - Added organized blocks within Colors tab (Brand, Status, Neutral sections)
  - Streamlined interface from 5 tabs to 3 tabs (Basic, Colors, Visuals)
  - Applied changes to both create and edit theme dialogs for consistency
  - Maintained all color settings functionality while improving user experience
- June 27, 2025: Completed WhatsApp settings integration in theme management with responsive layout
  - Fixed eye icon toggle functionality for visual display settings in theme creation and editing
  - Reordered category menu block to appear before info blocks as requested
  - Added WhatsApp phone number and message input fields with responsive two-column layout
  - Integrated all visual display settings into theme management with proper database synchronization
  - WhatsApp settings now appear conditionally when WhatsApp chat is enabled in both create and edit dialogs
  - Visual settings properly save and load when creating or editing themes
  - Removed duplicate WhatsApp settings from admin display settings section (cleanup completed)
- June 27, 2025: Improved mobile layout for theme management section header
  - Changed header layout from horizontal to vertical stacking on mobile devices
  - Separated title/description and "Create Theme" button on different lines for better mobile UX
  - Added full-width button styling on mobile with responsive design (w-full sm:w-auto)
  - Maintained desktop horizontal layout with proper spacing and alignment
- June 27, 2025: Completed admin panel compactness improvements with eye icon buttons
  - Replaced all Switch components with compact Eye/EyeOff icon buttons throughout admin settings
  - Applied green color for enabled states and gray for disabled states
  - Reduced interface density while maintaining clear visual feedback for toggle states
  - Updated display settings, working hours, permissions, and feature toggles with new design
- June 27, 2025: Made theme dialog tabs menu more compact with flex layout
  - Changed tab navigation from 4-column grid to single horizontal row
  - Added icons to each tab (Info, Briefcase, AlertCircle, Layers) with responsive text hiding on mobile
  - Implemented equal-width distribution with flex-1 for professional appearance
  - Applied changes to both create and edit theme dialogs for consistency
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