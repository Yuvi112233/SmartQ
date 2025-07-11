# SmartQ - Queue Management System

## Overview

SmartQ is a comprehensive queue management system designed for salons, boutiques, and barbers. It features a multi-panel interface with customer registration, queue tracking, admin authentication, and WhatsApp integration. The application uses a modern tech stack with React frontend, Express backend, JWT authentication, and WhatsApp messaging via Baileys.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)

✓ Added admin authentication system with JWT tokens
✓ Implemented WhatsApp integration using Baileys library
✓ Created customer queue tracking with real-time updates
✓ Added customer "now" page for turn notifications
✓ Enhanced phone number validation (Indian format)
✓ Implemented duplicate entry prevention
✓ Added customer arrival confirmation system
✓ Created comprehensive admin dashboard with queue management
✓ Fixed barber login authentication system (admin/smartq123)
✓ Added Socket.IO for real-time WhatsApp connection monitoring
✓ Implemented WhatsApp reconnection system with QR code display
✓ Added real-time connection status updates via Socket.IO
✓ Enhanced WhatsApp with persistent session storage (Jan 11, 2025)
✓ Fixed 401 authentication errors with session-based auth
✓ Added mobile-friendly WhatsApp reconnection with QR modal
✓ Implemented automatic session detection and recovery

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
- Simple form with name and phone validation (Indian format)
- Real-time queue status updates
- Queue position tracking
- Estimated wait time display
- Duplicate entry prevention
- Automatic redirect to queue tracking

### Customer Queue Page (`/customer/queue`)
- Real-time queue position tracking
- Live queue overview with masked phone numbers
- Progress bar showing queue advancement
- Auto-redirect when customer's turn arrives
- 5-second polling for updates

### Customer Now Page (`/customer/now`)
- Turn notification page for first-in-queue customers
- Arrival confirmation button
- WhatsApp message integration
- Thank you page after confirmation

### Barber Panel (`/barber`)
- Public interface for queue management
- Live queue display with auto-refresh
- "Call Next" functionality (removes first person)
- Individual customer removal capability
- Queue statistics and metrics

### Admin Dashboard (`/admin/dashboard`)
- Secure admin interface with JWT authentication
- Enhanced queue management with status tracking
- WhatsApp integration for customer notifications
- Real-time connection status monitoring
- Advanced queue statistics and controls

### Shared Components
- Reusable UI components from shadcn/ui
- Form validation components
- Toast notifications
- Loading states and skeletons

## Data Flow

1. **Customer Joins Queue**:
   - Customer fills form on `/customer` page
   - Form validation using Zod schema (Indian phone format)
   - Duplicate entry prevention check
   - POST request to `/api/queue` endpoint
   - Phone number stored in localStorage
   - Automatic redirect to `/customer/queue`

2. **Queue Tracking**:
   - Real-time position updates via polling
   - Auto-redirect to `/customer/now` when first in queue
   - Progress tracking and wait time estimates
   - Queue overview with masked phone numbers

3. **Customer Turn**:
   - Notification page shows when it's customer's turn
   - Arrival confirmation button
   - WhatsApp message sent (if admin connected)
   - Status update to "reached" in database

4. **Admin Management**:
   - JWT-based authentication
   - WhatsApp session management
   - Enhanced queue controls with status tracking
   - Real-time messaging integration

5. **Data Synchronization**:
   - TanStack Query manages caching and background updates
   - JWT token authentication for admin features
   - WhatsApp service status monitoring
   - Error handling with user-friendly messages

## API Endpoints

### Public Endpoints
- `POST /api/queue` - Add customer to queue
- `GET /api/queue` - Get current queue
- `GET /api/queue/position/:phone` - Get queue position
- `GET /api/queue/customer/:phone` - Get customer info
- `POST /api/customer/reached/:phone` - Confirm customer arrival

### Admin Endpoints (JWT Protected)
- `POST /api/admin/login` - Admin authentication
- `POST /api/barber/login` - Barber authentication (same as admin)
- `GET /api/whatsapp/status` - WhatsApp connection status
- `POST /api/whatsapp/login` - WhatsApp reconnection endpoint
- `POST /api/whatsapp/send/:phone` - Send WhatsApp message
- `POST /api/queue/call-next` - Call next customer with message
- `DELETE /api/queue/:id` - Remove customer from queue

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