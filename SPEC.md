# Ticketing Support System (Helpdesk) - Technical Specification

## 1. Project Overview

**Project Name:** Support Desk Pro  
**Project Type:** Full-stack Web Application (SaaS-style Helpdesk)  
**Core Functionality:** A comprehensive ticketing support system that allows users to submit support tickets, agents to manage and respond to tickets, and administrators to oversee the entire system.  
**Target Users:** End users seeking support, Support agents/agents, System administrators

## 2. Technology Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (Data Table, Dialog, Select, Checkbox, Button, Input, Textarea, Badge)
- **Icons:** Lucide React
- **Tables:** TanStack Table v8

### Backend
- **Runtime:** Next.js Server Actions
- **Data Fetching:** React Server Components (RSC)
- **ORM:** Prisma ORM

### Database
- **Database:** PostgreSQL
- **Connection:** postgresql://postgres:Password.123@localhost:5432/ticket_db

### Authentication
- **Library:** NextAuth.js v5 (Auth.js)
- **Providers:** Credentials provider (email/password)

## 3. Database Schema

### Models

#### User
```prisma
model User {
  id        String    @id @default(cuid())
  name      String
  email     String    @unique
  password  String    // Hashed
  role      Role      @default(USER)
  tickets   Ticket[]  @relation("UserTickets")
  assigned  Ticket[]  @relation("AssignedAgent")
  comments  Comment[]
  createdAt DateTime  @default(now())
}
```

#### Role Enum
```prisma
enum Role { USER, AGENT, ADMIN }
```

#### Priority Enum
```prisma
enum Priority { LOW, MEDIUM, HIGH }
```

#### Status Enum
```prisma
enum Status { NEW, IN_PROGRESS, WAITING_REPLY, REPLIED, ON_HOLD, RESOLVED }
```

#### Category
```prisma
model Category {
  id      String   @id @default(cuid())
  name    String
  tickets Ticket[]
}
```

#### Ticket
```prisma
model Ticket {
  id          String    @id @default(cuid())
  trackingId  String    @unique // e.g., "NT4-RYS-NQL9"
  title       String
  description String
  status      Status    @default(NEW)
  priority    Priority  @default(MEDIUM)
  
  userId      String
  user        User      @relation("UserTickets", fields: [userId], references: [id])
  
  agentId     String?
  agent       User?     @relation("AssignedAgent", fields: [agentId], references: [id])
  
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])
  
  comments    Comment[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

#### Comment
```prisma
model Comment {
  id        String   @id @default(cuid())
  content   String
  isInternal Boolean @default(false)
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

## 4. UI/UX Specification

### 4.1 Color Palette
- **Primary:** #0F172A (Slate 900 - dark backgrounds)
- **Secondary:** #1E293B (Slate 800 - cards, sidebars)
- **Accent:** #3B82F6 (Blue 500 - primary actions)
- **Success:** #22C55E (Green 500)
- **Warning:** #F59E0B (Amber 500)
- **Danger:** #EF4444 (Red 500)
- **Text Primary:** #F8FAFC (Slate 50)
- **Text Secondary:** #94A3B8 (Slate 400)
- **Border:** #334155 (Slate 700)
- **Background:** #020617 (Slate 950)

### 4.2 Typography
- **Font Family:** Inter (Google Fonts) with system fallbacks
- **Headings:**
  - H1: 32px, font-weight 700
  - H2: 24px, font-weight 600
  - H3: 20px, font-weight 600
  - H4: 16px, font-weight 600
- **Body:** 14px, font-weight 400
- **Small:** 12px, font-weight 400

### 4.3 Spacing System
- Base unit: 4px
- Padding: 8px, 12px, 16px, 24px, 32px
- Margins: 8px, 16px, 24px, 32px, 48px
- Border radius: 6px (sm), 8px (md), 12px (lg)

### 4.4 Layout Structure

#### Dashboard Layout
- **Left Sidebar (Collapsible):** 256px wide, navigation menu
- **Main Content Area:** Flexible width with max-width 1400px
- **Header:** 64px height, user menu, notifications

#### Pages

1. **Authentication Pages**
   - `/login` - Login form with email/password
   - `/register` - Registration form for new users

2. **Dashboard (/)**
   - Overview statistics cards (total tickets, open, resolved, etc.)
   - Recent tickets list
   - Quick actions

3. **Tickets List (/tickets)**
   - Advanced data table with:
     - Column sorting
     - Column filtering
     - Row selection
     - Pagination
     - Search functionality
   - Columns: Tracking ID, Title, Status, Priority, Category, Assigned Agent, Created, Actions
   - Bulk actions toolbar
   - Filter sidebar/panel

4. **Ticket Detail (/tickets/[id])**
   - Ticket information header
   - Status/Priority management
   - Comment thread with internal notes toggle
   - Activity timeline

5. **New Ticket (/tickets/new)**
   - Multi-step form or single page form
   - Category selection
   - Priority selection
   - File attachment placeholder (UI only)

6. **Admin Panel (/admin)**
   - User management table
   - Category management
   - System settings

### 4.5 Component States

#### Buttons
- Default: Background color, white text
- Hover: Slightly lighter background
- Active: Darker background
- Disabled: 50% opacity, cursor not-allowed
- Loading: Spinner icon, disabled state

#### Cards
- Background: Secondary color
- Border: 1px solid border color
- Border radius: 8px
- Shadow: Subtle shadow for depth

#### Table Rows
- Default: Transparent background
- Hover: Slightly lighter background
- Selected: Accent color with 10% opacity

### 4.6 Animations & Transitions
- Page transitions: Fade in, 200ms ease-out
- Modal: Scale from 95% to 100%, fade in, 200ms
- Dropdown: Slide down 4px, fade in, 150ms
- Button hover: Background color transition, 150ms

## 5. Functionality Specification

### 5.1 Authentication Features
- User registration with email validation
- User login with credentials
- Session management with JWT
- Role-based access control (RBAC)
- Protected routes based on authentication and roles

### 5.2 User Features
- Create new support tickets
- View own tickets
- Add comments to own tickets
- View ticket status and updates
- Edit/Delete draft tickets (if implemented)

### 5.3 Agent Features
- View all tickets assigned to them
- View all open tickets (queue view)
- Claim/unclaim tickets
- Add internal notes (comments)
- Reply to tickets (public comments)
- Update ticket status
- Update ticket priority
- Assign tickets to other agents

### 5.4 Admin Features
- All agent features
- User management (create, edit, delete, assign roles)
- Category management (create, edit, delete)
- View all tickets across the system
- Reassign tickets

### 5.5 Data Operations
- CRUD operations for tickets
- CRUD operations for comments
- CRUD operations for categories
- CRUD operations for users
- Tracking ID generation (format: XXX-XXX-XXXX)
- Filtering by status, priority, category, date range
- Sorting by any column
- Full-text search on ticket title and description

### 5.6 Edge Cases
- Empty states for lists
- Form validation (required fields, email format, password strength)
- Error handling with user-friendly messages
- Loading states for async operations
- Confirmation dialogs for destructive actions
- Session timeout handling
- Rate limiting (UI indication)

## 6. API Design (Server Actions)

### Authentication
- `login(formData)` - Authenticate user
- `register(formData)` - Create new user
- `logout()` - End session

### Tickets
- `getTickets(filters?)` - List tickets with filters
- `getTicket(id)` - Get single ticket
- `createTicket(data)` - Create new ticket
- `updateTicket(id, data)` - Update ticket
- `deleteTicket(id)` - Delete ticket
- `assignTicket(ticketId, agentId)` - Assign agent
- `updateTicketStatus(ticketId, status)` - Change status

### Comments
- `getComments(ticketId)` - List comments for ticket
- `addComment(ticketId, data)` - Add comment/note
- `deleteComment(id)` - Delete comment

### Categories
- `getCategories()` - List all categories
- `createCategory(data)` - Create category
- `updateCategory(id, data)` - Update category
- `deleteCategory(id)` - Delete category

### Users
- `getUsers()` - List all users
- `getUser(id)` - Get user details
- `updateUser(id, data)` - Update user
- `deleteUser(id)` - Delete user
- `getAgents()` - List all agents

## 7. File Structure

```
helpdesk/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx (dashboard home)
│   │   │   ├── tickets/
│   │   │   │   ├── page.tsx (tickets list)
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx (ticket detail)
│   │   │   │   └── new/
│   │   │   │       └── page.tsx (create ticket)
│   │   │   └── admin/
│   │   │       ├── page.tsx (admin dashboard)
│   │   │       ├── users/
│   │   │       │   └── page.tsx
│   │   │       └── categories/
│   │   │           └── page.tsx
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── dashboard/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── stats-card.tsx
│   │   ├── tickets/
│   │   │   ├── ticket-table.tsx
│   │   │   ├── ticket-filters.tsx
│   │   │   ├── ticket-detail.tsx
│   │   │   ├── ticket-form.tsx
│   │   │   └── comment-list.tsx
│   │   └── providers.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── utils.ts
│   │   └── validations.ts
│   ├── actions/
│   │   ├── auth-actions.ts
│   │   ├── ticket-actions.ts
│   │   ├── comment-actions.ts
│   │   ├── category-actions.ts
│   │   └── user-actions.ts
│   └── types/
│       └── index.ts
├── public/
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── components.json
├── next.config.js
└── SPEC.md
```

## 8. Acceptance Criteria

### Authentication
- [ ] Users can register with name, email, password
- [ ] Users can login with email/password
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Role-based access restricts admin pages to admins only

### Tickets
- [ ] Users can create tickets with title, description, category, priority
- [ ] Tickets get unique tracking IDs (format: XXX-XXX-XXXX)
- [ ] Users can view their own tickets
- [ ] Agents can view all tickets
- [ ] Ticket list shows all required columns
- [ ] Filters work for status, priority, category, date
- [ ] Sorting works on all columns
- [ ] Pagination works correctly

### Ticket Details
- [ ] Shows full ticket information
- [ ] Displays all comments in chronological order
- [ ] Agents can add public comments
- [ ] Agents can add internal notes
- [ ] Status and priority can be updated
- [ ] Ticket can be assigned to an agent

### Admin
- [ ] User management table displays all users
- [ ] Admin can create/edit/delete users
- [ ] Admin can change user roles
- [ ] Category management works

### UI/UX
- [ ] Dark theme applied consistently
- [ ] All buttons have hover states
- [ ] Loading states shown during async operations
- [ ] Error messages displayed user-friendly
- [ ] Empty states shown for empty lists
- [ ] Responsive design works on tablet and desktop

## 9. Security Considerations

- Passwords hashed with bcrypt
- CSRF protection via NextAuth
- Input sanitization on all forms
- SQL injection prevention via Prisma
- XSS prevention via React
- Rate limiting on auth endpoints
- Session timeout after inactivity

## 10. Performance Considerations

- Server Components for initial page loads
- Client Components only where interactivity needed
- Optimistic updates for better UX
- Debounced search inputs
- Pagination to limit data load
- Indexed database fields for filtering