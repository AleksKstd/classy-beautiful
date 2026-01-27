# Classy & Beautiful - Beauty Salon Website

Елегантен уебсайт за козметичен салон "Classy & Beautiful" с онлайн резервации.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **UI Components**: shadcn/ui, Radix UI, Lucide Icons
- **Backend**: Supabase (PostgreSQL database + API)
- **Validation**: Zod (client + server-side)
- **Date Handling**: date-fns

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works)

## 🚀 Getting Started

### 1. Clone and Install

```bash
cd classy-beautiful
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema:
   - First run `supabase/schema.sql` to create tables
   - Then run `supabase/seed.sql` to add sample data

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Find these values in your Supabase dashboard under **Settings > API**.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## 📁 Project Structure

```
src/
├── app/
│   ├── actions/          # Server actions
│   ├── rezervacii/       # Reservations page
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── header.tsx        # Navigation header
│   ├── footer.tsx        # Site footer
│   ├── hero-carousel.tsx # Image carousel
│   ├── services-section.tsx
│   ├── reservation-wizard.tsx
│   └── reservation-success.tsx
├── lib/
│   ├── supabase/         # Supabase clients
│   ├── availability.ts   # Time slot logic
│   ├── procedures.ts     # Category structure
│   ├── utils.ts          # Utility functions
│   └── validation.ts     # Zod schemas
└── types/
    └── database.ts       # TypeScript types
```

## 🎨 Brand Guidelines

### Fonts

- **Logo**: Uses "INFINITE STROKE" font - **DO NOT CHANGE**
  - The logo SVG must be used as-is without modifications
  - Never replace or alter the logo typography
  
- **Site Text**: Myriad Pro / Myriad Pro Condensed
  - Fallback stack: Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif

### Colors

- **Primary Black**: `#000000`
- **Gold Accent**: `#C4A35A` (used for CTAs, frames, highlights)
- **Background**: White with minimal gray accents

### Icons

- Use minimalist lineart icons (Lucide)
- Social/utility icons: circular background with white/transparent icon

## 🗄️ Database Schema

### Tables

1. **procedures** - Beauty treatments
   - `id`, `name`, `duration_minutes`, `price`, `is_active`, `discount_percentage`, `type`, `technician`
   - Managed locally for display and pricing

2. **schedules** - Closed dates/times
   - `id`, `office_name`, `closed_date_start`, `closed_date_end`
   - Block off time periods when salon is closed (holidays, renovations)

3. **reservation_logs** - Analytics tracking
   - `id`, `procedure_id`, `office_name`, `booked_at`, `source`
   - Tracks popular procedures for analytics (no customer data stored)

### Procedure Categories

- Нокти (Nails)
- Мигли и вежди (Lashes & Brows)
- Лице (Face)
- Епилация (Hair Removal)
  - Лазерна епилация
    - Епилация за жени
    - Епилация за мъже
  - Кола маска
    - Епилация за жени
    - Епилация за мъже

## ✅ Features

- [x] Responsive design (mobile-first)
- [x] Hero section with image carousel
- [x] Popular procedures section (based on booking analytics)
- [x] Current discounts section
- [x] Services overview
- [x] 4-step reservation wizard
  - Step 1: Choose office (София/Лом)
  - Step 2: Select procedure (with categories)
  - Step 3: Pick date and time slot
  - Step 4: Enter customer details
- [x] Real-time availability checking
- [x] Phone validation (Bulgarian formats)
- [x] Server-side validation with Zod
- [x] Schedule closures (manual blocking of dates)
- [x] Reservation analytics tracking
- [x] Accessibility (ARIA, keyboard navigation)
- [x] Bulgarian language UI
- [ ] External API integration (ready for implementation)

## 🔌 External API Integration

This app is designed to integrate with an external booking API. See `ARCHITECTURE.md` for detailed integration instructions.

**Current Status:** Hybrid architecture
- Procedures and schedules managed locally
- Reservation logs tracked for analytics
- External API integration points prepared in `src/app/actions/external-api.ts`

**When external API is available:**
1. Update `checkExternalAvailability()` function
2. Update `createExternalBooking()` function
3. Add API credentials to `.env.local`
4. Test integration

See `ARCHITECTURE.md` for complete migration guide.

## �‍💼 Admin Panel

The site includes a comprehensive admin panel for managing content.

### Access

1. Go to the website footer
2. Click the copyright text **3 times quickly**
3. An "Админ панел" link will appear
4. Click to go to `/admin`
5. Login with:
   - **Username**: `CvetiAdm`
   - **Password**: `CBCveti356-`

### Features

**Procedures Management**
- Add, edit, delete procedures
- Set discounts on procedures
- Enable/disable procedures
- Organize by categories

**Carousel Images**
- Upload images for hero carousel
- Delete images
- Reorder images (drag up/down)
- Images stored in Supabase Storage

**Schedule Management**
- Block off dates when salon is closed
- Set closures per office (София/Лом)
- Manage holidays and renovations
- View past and upcoming closures

### Security

- Admin credentials are hardcoded and hashed with SHA256
- Session-based authentication (24-hour sessions)
- All admin actions require authentication
- Credentials cannot be changed without code modification

## �🔒 Security

- All form inputs validated on both client and server
- Phone numbers normalized before storage
- Row Level Security enabled on Supabase tables
- No user authentication required for public booking
- Admin panel protected with SHA256 hashed credentials

## 📱 Responsive Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## 🧪 Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 📄 License

Private - Classy & Beautiful © 2026
