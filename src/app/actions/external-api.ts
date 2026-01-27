"use server";

import { createClient } from "@/lib/supabase/server";
import type { ReservationLogInsert } from "@/types/database";

/**
 * External API Integration Layer
 * 
 * This file contains placeholder functions for integrating with the external booking API.
 * Replace these implementations once the external API is provided.
 */

// Placeholder types for external API responses
interface ExternalAvailabilityResponse {
  availableSlots: string[];
  // Add other fields based on actual API response
}

interface ExternalBookingRequest {
  officeName: string;
  procedureId: string;
  startAt: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  note?: string;
}

interface ExternalBookingResponse {
  success: boolean;
  bookingId?: string;
  error?: string;
}

/**
 * Check availability from external API
 * TODO: Replace with actual external API call when available
 */
export async function checkExternalAvailability(
  officeName: string,
  date: string,
  procedureId: string
): Promise<ExternalAvailabilityResponse> {
  // TODO: Replace with actual API call
  // Example:
  // const response = await fetch(`${EXTERNAL_API_URL}/availability`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ officeName, date, procedureId })
  // });
  // return response.json();
  
  // Placeholder - returns empty for now
  return {
    availableSlots: []
  };
}

/**
 * Create booking via external API
 * TODO: Replace with actual external API call when available
 */
export async function createExternalBooking(
  request: ExternalBookingRequest
): Promise<ExternalBookingResponse> {
  // TODO: Replace with actual API call
  // Example:
  // const response = await fetch(`${EXTERNAL_API_URL}/bookings`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(request)
  // });
  // return response.json();
  
  // Placeholder - returns error for now
  return {
    success: false,
    error: "External API not yet configured"
  };
}

/**
 * Log a successful reservation for analytics
 * This tracks popular procedures on your site
 */
export async function logReservation(
  procedureId: string,
  officeName: "София" | "Лом"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const logEntry: ReservationLogInsert = {
      procedure_id: procedureId,
      office_name: officeName,
      source: "website"
    };

    const { error } = await supabase
      .from("reservation_logs")
      .insert(logEntry);

    if (error) {
      console.error("Failed to log reservation:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error logging reservation:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get most popular procedures based on reservation logs
 * Used for "Popular Procedures" section on landing page
 */
export async function getPopularProcedures(limit: number = 6) {
  try {
    const supabase = await createClient();
    
    // Get procedure IDs with most bookings in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logs, error: logsError } = await supabase
      .from("reservation_logs")
      .select("procedure_id")
      .gte("booked_at", thirtyDaysAgo.toISOString());

    if (logsError) throw logsError;

    // Count occurrences
    const counts = logs.reduce((acc, log) => {
      acc[log.procedure_id] = (acc[log.procedure_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sort by count and get top procedure IDs
    const topProcedureIds = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);

    if (topProcedureIds.length === 0) {
      return [];
    }

    // Fetch full procedure details
    const { data: procedures, error: procError } = await supabase
      .from("procedures")
      .select("*")
      .in("id", topProcedureIds)
      .eq("is_active", true);

    if (procError) throw procError;

    // Sort procedures by booking count
    return procedures.sort((a, b) => {
      return counts[b.id] - counts[a.id];
    });
  } catch (error) {
    console.error("Error fetching popular procedures:", error);
    return [];
  }
}

/**
 * Get procedures with active discounts
 * Used for "Current Discounts" section on landing page
 */
export async function getDiscountedProcedures() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("procedures")
      .select("*")
      .eq("is_active", true)
      .not("discount_percentage", "is", null)
      .gt("discount_percentage", 0)
      .order("discount_percentage", { ascending: false });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching discounted procedures:", error);
    return [];
  }
}
