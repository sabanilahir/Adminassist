# Support Desk Pro - Ticketing System

A comprehensive ticketing support system built with Next.js 14+, TypeScript, Prisma ORM, and NextAuth.js v5.

## Features

- **User Authentication**: Secure login/register with role-based access control
- **Role-Based Access**: User, Agent, and Admin roles with different permissions
- **Ticket Management**: Create, view, update, and delete support tickets
- **Custom Tracking IDs**: Every ticket gets a unique tracking ID (e.g., NT4-RYS-NQL9)
- **Comments System**: Public comments and internal notes for agents
- **Status & Priority**: Multiple ticket statuses and priority levels
- **Categories**: Organize tickets by category
- **Admin Dashboard**: Manage users and categories
- **Modern UI**: Dark theme with Tailwind CSS and shadcn/ui components
- **TanStack Table**: Advanced data table with sorting, filtering, and pagination

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **UI/Styling**: Tailwind CSS, shadcn/ui, Lucide React
- **Data Fetching**: React Server Components and Server Actions
- **Tables**: TanStack Table v8

## Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or pnpm

## Setup Instructions

### 1. Install Dependencies

```bash
cd helpdesk
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root with your database credentials:

```env
DATABASE_URL="postgresql://postgres:Password.123@localhost:5432/ticket_db?schema=public"
AUTH_SECRET="super-secret-key-change-this-in-production-123456789"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Set Up Database

Make sure PostgreSQL is running and create the database:

```sql
CREATE DATABASE ticket_db;
```

Then run Prisma migrations and generate the client:

```bash
npm run db:generate
npm run db:push
```

### 4. Seed the Database (Optional)

Populate the database with sample data:

```bash
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Credentials

After seeding the database, you can use these credentials:

| Role   | Email                        | Password  |
|--------|------------------------------|-----------|
| Admin  | admin@helpdesk.com           | admin123  |
| Agent  | john.smith@helpdesk.com      | agent123  |
| Agent  | sarah.johnson@helpdesk.com    | agent123  |
| User   | alice.wonder@email.com       | user123   |
| User   | bob.builder@email.com        | user123   |

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database and reseed

## Project Structure

```
helpdesk/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seed script
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── (auth)/        # Authentication pages
│   │   ├── (dashboard)/    # Dashboard pages
│   │   └── api/           # API routes
│   ├── components/        # React components
│   │   ├── ui/            # shadcn/ui components
│   │   └── dashboard/     # Dashboard components
│   ├── lib/               # Library utilities
│   ├── actions/           # Server actions
│   └── types/             # TypeScript types
├── SPEC.md                # Technical specification
└── README.md              # This file
```

## Ticket Statuses

- **NEW**: New ticket created
- **IN_PROGRESS**: Agent has started working
- **WAITING_REPLY**: Waiting for customer response
- **REPLIED**: Agent has replied
- **ON_HOLD**: Ticket is on hold
- **RESOLVED**: Ticket is resolved

## Ticket Priorities

- **LOW**: Low priority
- **MEDIUM**: Medium priority
- **HIGH**: High priority

## License

MIT