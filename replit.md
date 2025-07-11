# SmartQ - Queue Management System

## Overview

SmartQ is a full-stack queue management system designed for salons, boutiques, and barbers. It provides a dual-panel interface: one for customers to join the queue and another for barbers to manage the queue. The application uses a modern tech stack with React frontend, Express backend, and PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database ORM**: Drizzle ORM
- **Validation**: Zod schemas shared between frontend and backend
- **API Style**: RESTful endpoints

### Database Architecture
- **Database**: PostgreSQL (configured via Drizzle)
- **Cloud Provider**: Neon Database (@neondatabase/serverless)
- **Schema Management**: Drizzle migrations

## Key Components

### Customer Panel (`/customer`)
- Mobile-first responsive design
- Simple form with name and phone validation
- Real-time queue status updates
- Queue position tracking
- Estimated wait time display

### Barber Panel (`/barber`)
- Admin interface for queue management
- Live queue display with auto-refresh
- "Call Next" functionality (removes first person)
- Individual customer removal capability
- Queue statistics and metrics

### Shared Components
- Reusable UI components from shadcn/ui
- Form validation components
- Toast notifications
- Loading states and skeletons

## Data Flow

1. **Customer Joins Queue**:
   - Customer fills form on `/customer` page
   - Form validation using Zod schema
   - POST request to `/api/queue` endpoint
   - Database entry created with timestamp
   - Success confirmation displayed

2. **Queue Management**:
   - Barber views live queue on `/barber` page
   - Real-time updates via polling (3-5 second intervals)
   - Queue operations trigger database updates
   - UI updates automatically via React Query

3. **Data Synchronization**:
   - TanStack Query manages caching and background updates
   - Optimistic updates for better UX
   - Error handling with user-friendly messages

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling
- **zod**: Schema validation
- **wouter**: Lightweight routing

### UI Dependencies
- **@radix-ui/***: Accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **tsx**: TypeScript execution

## Deployment Strategy

### Development Environment
- Vite dev server for frontend hot reloading
- Express server with TypeScript compilation
- Database migrations via Drizzle Kit
- Environment variables for database connection

### Production Build
- Frontend built to static files via Vite
- Backend bundled with esbuild
- Database migrations applied via `drizzle-kit push`
- Environment variables required: `DATABASE_URL`

### File Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express application
├── shared/          # Shared TypeScript types and schemas
├── migrations/      # Database migration files
└── dist/           # Production build output
```

### Database Schema
The application uses a single `queue_entries` table with:
- `id`: Auto-incrementing primary key
- `name`: Customer name (required)
- `phone`: Customer phone number (required)
- `timestamp`: Entry creation time (auto-generated)
- `status`: Queue status (default: "waiting")

### Error Handling
- Form validation on both client and server
- Database connection error handling
- User-friendly error messages via toast notifications
- Graceful fallbacks for network issues

The architecture prioritizes simplicity, real-time updates, and user experience while maintaining type safety throughout the stack.