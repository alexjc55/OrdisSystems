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

- June 26, 2025: Fixed admin dashboard data display and functionality
  - Resolved critical JSX syntax errors and import issues in admin dashboard
  - Restored data visualization for all admin sections (Orders, Products, Categories, Users)
  - Fixed TypeScript type safety issues with API data handling
  - Added proper search, filtering and display functionality for all sections
  - Admin dashboard now shows real data from database instead of empty placeholders
- June 26, 2025: Completed systematic elimination of hardcoded text in admin panel
  - Replaced all UI hardcoded Russian text with translation functions
  - Added comprehensive translations for admin settings sections in 3 languages
  - Fixed RTL alignment issues for Hebrew interface (icons and arrows positioning)
  - Resolved JSON syntax errors in translation files
- June 23, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.