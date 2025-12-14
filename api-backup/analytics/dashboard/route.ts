import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Mock analytics data - in production, this would query your actual database
    const mockMetrics = {
      revenue: {
        current: Math.floor(Math.random() * 100000) + 200000, // $200k-$300k
        previous: Math.floor(Math.random() * 100000) + 180000, // $180k-$280k
        trend: Math.random() > 0.3 ? 'up' : 'down',
        percentage: (Math.random() * 20) - 10 // -10% to +10%
      },
      profit: {
        current: Math.floor(Math.random() * 50000) + 50000, // $50k-$100k
        previous: Math.floor(Math.random() * 50000) + 45000, // $45k-$95k
        trend: Math.random() > 0.4 ? 'up' : 'down',
        percentage: (Math.random() * 25) - 12.5 // -12.5% to +12.5%
      },
      activeDrivers: {
        current: Math.floor(Math.random() * 10) + 25, // 25-35 drivers
        previous: Math.floor(Math.random() * 10) + 22, // 22-32 drivers
        trend: Math.random() > 0.5 ? 'up' : 'down'
      },
      activeVehicles: {
        current: Math.floor(Math.random() * 5) + 18, // 18-23 vehicles
        maintenance: Math.floor(Math.random() * 3) + 1, // 1-4 in maintenance
        outOfService: Math.floor(Math.random() * 2) // 0-1 out of service
      },
      compliance: {
        compliant: Math.floor(Math.random() * 20) + 140, // 140-160 compliant items
        expiringSoon: Math.floor(Math.random() * 10) + 5, // 5-15 expiring soon
        expired: Math.floor(Math.random() * 5) + 1, // 1-6 expired
        total: 0 // Will be calculated
      },
      tickets: {
        processed: Math.floor(Math.random() * 100) + 450, // 450-550 processed
        pending: Math.floor(Math.random() * 20) + 10, // 10-30 pending
        rejected: Math.floor(Math.random() * 10) + 2 // 2-12 rejected
      },
      safety: {
        dvirCompliance: Math.floor(Math.random() * 15) + 85, // 85-100%
        incidents: Math.floor(Math.random() * 3), // 0-3 incidents
        safetyScore: Math.floor(Math.random() * 10) + 90 // 90-100
      }
    };

    // Calculate totals
    mockMetrics.compliance.total = 
      mockMetrics.compliance.compliant + 
      mockMetrics.compliance.expiringSoon + 
      mockMetrics.compliance.expired;

    return NextResponse.json({
      success: true,
      metrics: mockMetrics,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        range
      }
    });

  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load analytics data' },
      { status: 500 }
    );
  }
}

