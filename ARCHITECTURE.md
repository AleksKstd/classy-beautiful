# Architecture Documentation

## Overview

This application uses a **hybrid architecture** designed to work with your local database now and integrate with an external booking API later.

## Current Architecture (Phase 1)

### Database Schema

**Tables:**

1. **`procedures`** - Store all beauty procedures
   - Managed locally in Supabase
   - Includes pricing, duration, technician, discount info
   - Used for displaying services and calculating prices

2. **`schedules`** - Block off closed dates/times
   - Allows manual closure of salon for holidays, renovations, etc.
   - Useful if external API doesn't provide this feature
   - Can be managed via admin interface (future)

3. **`reservation_logs`** - Analytics tracking
   - Logs when a procedure is booked from your site
   - Used for "Popular Procedures" section
   - Lightweight (only procedure_id, office, timestamp)
   - **Does NOT store customer data** (that's in external API)

### Key Features

#### 1. Popular Procedures Section
- Shows top 6 most-booked procedures from last 30 days
- Based on `reservation_logs` table
- Auto-updates as bookings happen

#### 2. Discounts Section
- Shows procedures with `discount_percentage > 0`
- Displays original price, discounted price, savings
- Encourages bookings with special offers

#### 3. Schedule Closures
- Manually block time periods when salon is closed
- Checked during availability lookup
- Prevents bookings during holidays/renovations

## External API Integration (Phase 2)

### Integration Points

File: `src/app/actions/external-api.ts`

**Functions to implement when API is available:**

1. **`checkExternalAvailability()`**
   - Replace placeholder with actual API call
   - Fetch available time slots from external system
   - Merge with local schedule closures

2. **`createExternalBooking()`**
   - Replace placeholder with actual API call
   - Send booking request to external system
   - On success, call `logReservation()` for analytics

3. **`logReservation()`** ✅ Already implemented
   - Tracks bookings in local DB for analytics
   - Call this after successful external API booking

### Migration Steps

When external API becomes available:

1. **Get API credentials and documentation**
   - Base URL
   - Authentication method (API key, OAuth, etc.)
   - Endpoint specifications

2. **Update `external-api.ts`**
   ```typescript
   // Example implementation
   const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL;
   const API_KEY = process.env.EXTERNAL_API_KEY;

   export async function checkExternalAvailability(...) {
     const response = await fetch(`${EXTERNAL_API_URL}/availability`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${API_KEY}`
       },
       body: JSON.stringify({ officeName, date, procedureId })
     });
     return response.json();
   }
   ```

3. **Update reservation wizard**
   - File: `src/components/reservation-wizard.tsx`
   - Replace local availability logic with `checkExternalAvailability()`
   - Replace `createReservation()` with `createExternalBooking()`
   - Keep `logReservation()` call for analytics

4. **Test integration**
   - Verify availability checking works
   - Verify bookings are created in external system
   - Verify analytics logging still works

## Data Flow

### Current Flow (Local DB)
```
User → Reservation Wizard → Local Supabase → Confirmation
                          ↓
                   reservation_logs (analytics)
```

### Future Flow (External API)
```
User → Reservation Wizard → External API → Confirmation
                          ↓
                   reservation_logs (analytics only)
```

## Environment Variables

### Current (Phase 1)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### Future (Phase 2)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
EXTERNAL_API_URL=external_booking_api_url
EXTERNAL_API_KEY=external_api_key
```

## Admin Features (Future)

Recommended admin panel features:

1. **Manage Procedures**
   - Add/edit/disable procedures
   - Set discounts
   - Update pricing

2. **Manage Schedule Closures**
   - Add closed date ranges
   - View upcoming closures
   - Delete/edit closures

3. **View Analytics**
   - Popular procedures report
   - Booking trends
   - Revenue by procedure

4. **Sync with External API** (if needed)
   - Import procedures from external API
   - Sync pricing updates
   - Reconcile bookings

## Performance Considerations

- **No performance logging needed** - This is a small business site
- Focus on user experience and booking conversion
- Analytics limited to procedure popularity only

## Security

- Row Level Security (RLS) enabled on all tables
- Public read access to procedures and schedules
- Public insert access to reservation_logs (analytics only)
- No sensitive customer data stored locally
- All customer data handled by external API

## Maintenance

### Regular Tasks
1. Review and update discounts monthly
2. Add schedule closures for holidays
3. Monitor popular procedures for marketing insights
4. Clean old reservation_logs (optional, after 6-12 months)

### When External API Changes
1. Update type definitions in `external-api.ts`
2. Test integration thoroughly
3. Update error handling
4. Document any API quirks or limitations
