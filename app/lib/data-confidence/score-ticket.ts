// Helper function to score ticket confidence
// Can be called from Edge Functions or API routes

/**
 * Score confidence for a ticket after creation
 * This function calls the confidence scoring API
 */
export async function scoreTicketConfidenceAsync(
  ticketId: string,
  driverId?: string,
  siteId?: string,
  baseUrl?: string
): Promise<void> {
  try {
    // Use provided baseUrl or construct from environment
    const apiUrl = baseUrl 
      ? `${baseUrl}/api/tickets/score-confidence`
      : process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/tickets/score-confidence`
        : 'http://localhost:3000/api/tickets/score-confidence';
    
    // Call confidence scoring API (async, don't wait)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId,
        driverId,
        siteId,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to score confidence for ticket ${ticketId}:`, await response.text());
    }
  } catch (err) {
    // Don't throw - confidence scoring is non-blocking
    console.error(`Error scoring confidence for ticket ${ticketId}:`, err);
  }
}
