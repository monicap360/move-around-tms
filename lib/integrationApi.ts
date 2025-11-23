<<<<<<< HEAD
// Integration API utilities for external systems
export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  status: 'active' | 'inactive' | 'suspended';
  hireDate: string;
}

export interface ApiResponse<T> {
=======
// Integration API Framework for Ronyx Logistics TMS HR System
// RESTful API endpoints for external system integration

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// API Authentication Middleware
async function authenticateApiRequest(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!apiKey && !authToken) {
    return NextResponse.json(
      { error: 'API key or authorization token required' },
      { status: 401 }
    );
  }

  // In production, validate against stored API keys/tokens
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  if (apiKey && !validApiKeys.includes(apiKey)) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }

  return null; // Authentication successful
}

// Standard API Response Format
export interface ApiResponse<T = any> {
>>>>>>> 34e73bd382610bff689903bedc8d62eed355fc8a
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
<<<<<<< HEAD
}

export async function fetchDrivers(): Promise<ApiResponse<Driver[]>> {
  try {
    // Mock implementation - in real app, this would call external API
    const mockDrivers: Driver[] = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-0101',
        licenseNumber: 'DL123456789',
        status: 'active',
        hireDate: '2024-01-15'
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com', 
        phone: '555-0102',
        licenseNumber: 'DL987654321',
        status: 'active',
        hireDate: '2024-02-20'
      }
    ];

    return {
      success: true,
      data: mockDrivers,
      message: 'Drivers fetched successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch drivers'
    };
  }
}

export async function fetchDriverById(id: string): Promise<ApiResponse<Driver>> {
  try {
    // Mock implementation
    const mockDriver: Driver = {
      id,
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '555-0101',
      licenseNumber: 'DL123456789',
      status: 'active',
      hireDate: '2024-01-15'
    };

    return {
      success: true,
      data: mockDriver,
      message: 'Driver fetched successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch driver'
    };
  }
}

export async function updateDriver(id: string, updates: Partial<Driver>): Promise<ApiResponse<Driver>> {
  try {
    // Mock implementation
    const updatedDriver: Driver = {
      id,
      name: updates.name || 'John Doe',
      email: updates.email || 'john.doe@example.com',
      phone: updates.phone || '555-0101',
      licenseNumber: updates.licenseNumber || 'DL123456789',
      status: updates.status || 'active',
      hireDate: updates.hireDate || '2024-01-15'
    };

    return {
      success: true,
      data: updatedDriver,
      message: 'Driver updated successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update driver'
    };
  }
}

export async function createDriver(driverData: Omit<Driver, 'id'>): Promise<ApiResponse<Driver>> {
  try {
    // Mock implementation
    const newDriver: Driver = {
      id: Math.random().toString(36).substr(2, 9),
      ...driverData
    };

    return {
      success: true,
      data: newDriver,
      message: 'Driver created successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create driver'
    };
  }
}

export async function deleteDriver(id: string): Promise<ApiResponse<null>> {
  try {
    // Mock implementation
    return {
      success: true,
      data: null,
      message: 'Driver deleted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete driver'
    };
  }
}

// Legacy exports for compatibility
export const DriverAPI = {
  fetchDrivers,
  fetchDriverById,
  updateDriver,
  createDriver,
  deleteDriver,
  // Alias methods for backward compatibility
  getDrivers: fetchDrivers,
  getDriver: fetchDriverById
};

export async function authenticateApiRequest(request: any): Promise<null | Response> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const token = authHeader.substring(7);
    
    // Simple validation (in real app, verify JWT token)
    if (token.length < 10) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return null; // No error, request is authenticated
  } catch (error) {
    console.error('API authentication error:', error);
    return new Response(JSON.stringify({ error: 'Authentication failed' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
=======
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string,
  pagination?: any
): ApiResponse<T> {
  return {
    success,
    data,
    error,
    message,
    pagination
  };
}

// Pagination Helper
function getPaginationParams(request: NextRequest) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

// Driver API Endpoints
class DriverAPI {
  // GET /api/v1/drivers - Get all drivers with filtering
  static async getDrivers(request: NextRequest) {
    try {
      const { page, limit, offset } = getPaginationParams(request);
      const url = new URL(request.url);
      
      // Filtering parameters
      const status = url.searchParams.get('status');
      const cdlClass = url.searchParams.get('cdl_class');
      const hireDate = url.searchParams.get('hire_date_after');
      
      let query = supabase
        .from('drivers_enhanced')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (status) query = query.eq('employment_status', status);
      if (cdlClass) query = query.eq('cdl_class', cdlClass);
      if (hireDate) query = query.gte('hire_date', hireDate);

      const { data, count, error } = await query;

      if (error) {
        return NextResponse.json(
          createApiResponse(false, null, error.message),
          { status: 500 }
        );
      }

      const totalPages = Math.ceil((count || 0) / limit);
      
      return NextResponse.json(
        createApiResponse(
          true,
          data,
          undefined,
          `Retrieved ${data?.length || 0} drivers`,
          { page, limit, total: count || 0, totalPages }
        )
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }

  // GET /api/v1/drivers/:id - Get single driver
  static async getDriver(driverId: string) {
    try {
      const { data, error } = await supabase
        .from('drivers_enhanced')
        .select('*')
        .eq('id', driverId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          createApiResponse(false, null, 'Driver not found'),
          { status: 404 }
        );
      }

      return NextResponse.json(
        createApiResponse(true, data, undefined, 'Driver retrieved successfully')
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }

  // PUT /api/v1/drivers/:id - Update driver
  static async updateDriver(driverId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('drivers_enhanced')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          createApiResponse(false, null, error.message),
          { status: 400 }
        );
      }

      return NextResponse.json(
        createApiResponse(true, data, undefined, 'Driver updated successfully')
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }

  // POST /api/v1/drivers - Create new driver
  static async createDriver(driverData: any) {
    try {
      const { data, error } = await supabase
        .from('drivers_enhanced')
        .insert([{
          ...driverData,
          employee_id: driverData.employee_id || `DRV-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          createApiResponse(false, null, error.message),
          { status: 400 }
        );
      }

      return NextResponse.json(
        createApiResponse(true, data, undefined, 'Driver created successfully'),
        { status: 201 }
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }
}

// Performance API Endpoints
class PerformanceAPI {
  // GET /api/v1/performance/drivers - Get driver performance metrics
  static async getDriverPerformance(request: NextRequest) {
    try {
      const { page, limit, offset } = getPaginationParams(request);
      
      const { data, count, error } = await supabase
        .from('driver_performance_summary')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1);

      if (error) {
        return NextResponse.json(
          createApiResponse(false, null, error.message),
          { status: 500 }
        );
      }

      const totalPages = Math.ceil((count || 0) / limit);
      
      return NextResponse.json(
        createApiResponse(
          true,
          data,
          undefined,
          `Retrieved performance data for ${data?.length || 0} drivers`,
          { page, limit, total: count || 0, totalPages }
        )
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }

  // GET /api/v1/performance/drivers/:id - Get individual driver performance
  static async getDriverPerformanceById(driverId: string) {
    try {
      const { data, error } = await supabase
        .from('driver_performance_summary')
        .select('*')
        .eq('driver_id', driverId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          createApiResponse(false, null, 'Performance data not found'),
          { status: 404 }
        );
      }

      return NextResponse.json(
        createApiResponse(true, data, undefined, 'Performance data retrieved successfully')
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }

  // POST /api/v1/performance/incidents - Create incident report
  static async createIncident(incidentData: any) {
    try {
      const { data, error } = await supabase
        .from('driver_incidents')
        .insert([{
          ...incidentData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          createApiResponse(false, null, error.message),
          { status: 400 }
        );
      }

      return NextResponse.json(
        createApiResponse(true, data, undefined, 'Incident reported successfully'),
        { status: 201 }
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }
}

// Compliance API Endpoints
class ComplianceAPI {
  // GET /api/v1/compliance/drivers - Get driver compliance status
  static async getComplianceStatus(request: NextRequest) {
    try {
      const { page, limit, offset } = getPaginationParams(request);
      
      const { data, count, error } = await supabase
        .from('compliance_dashboard_summary')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1);

      if (error) {
        return NextResponse.json(
          createApiResponse(false, null, error.message),
          { status: 500 }
        );
      }

      const totalPages = Math.ceil((count || 0) / limit);
      
      return NextResponse.json(
        createApiResponse(
          true,
          data,
          undefined,
          `Retrieved compliance status for ${data?.length || 0} drivers`,
          { page, limit, total: count || 0, totalPages }
        )
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }

  // GET /api/v1/compliance/alerts - Get active compliance alerts
  static async getComplianceAlerts() {
    try {
      const { data, error } = await supabase
        .from('compliance_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          createApiResponse(false, null, error.message),
          { status: 500 }
        );
      }

      return NextResponse.json(
        createApiResponse(true, data, undefined, `Retrieved ${data?.length || 0} active alerts`)
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }

  // PUT /api/v1/compliance/alerts/:id/acknowledge - Acknowledge alert
  static async acknowledgeAlert(alertId: string) {
    try {
      const { data, error } = await supabase
        .from('compliance_alerts')
        .update({
          acknowledged: true,
          acknowledged_date: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          createApiResponse(false, null, error.message),
          { status: 400 }
        );
      }

      return NextResponse.json(
        createApiResponse(true, data, undefined, 'Alert acknowledged successfully')
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }
}

// Onboarding API Endpoints
class OnboardingAPI {
  // GET /api/v1/onboarding - Get all onboarding workflows
  static async getOnboardingWorkflows(request: NextRequest) {
    try {
      const { page, limit, offset } = getPaginationParams(request);
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      
      let query = supabase
        .from('driver_onboarding_workflows')
        .select(`
          *,
          drivers_enhanced!inner(name, employee_id)
        `, { count: 'exact' })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('workflow_status', status);
      }

      const { data, count, error } = await query;

      if (error) {
        return NextResponse.json(
          createApiResponse(false, null, error.message),
          { status: 500 }
        );
      }

      const totalPages = Math.ceil((count || 0) / limit);
      
      return NextResponse.json(
        createApiResponse(
          true,
          data,
          undefined,
          `Retrieved ${data?.length || 0} onboarding workflows`,
          { page, limit, total: count || 0, totalPages }
        )
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }

  // POST /api/v1/onboarding/:driverId/complete-step - Complete onboarding step
  static async completeOnboardingStep(driverId: string, stepData: any) {
    try {
      // Update step completion in onboarding_workflow_steps
      const { data, error } = await supabase
        .from('onboarding_workflow_steps')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString(),
          notes: stepData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('workflow_id', stepData.workflow_id)
        .eq('step_order', stepData.step_order)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          createApiResponse(false, null, error.message),
          { status: 400 }
        );
      }

      return NextResponse.json(
        createApiResponse(true, data, undefined, 'Onboarding step completed successfully')
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }
}

// Webhook Endpoints for External Systems
class WebhookAPI {
  // POST /api/v1/webhooks/payroll-update - Receive payroll updates
  static async handlePayrollUpdate(payrollData: any) {
    try {
      // Update driver information based on payroll data
      const { data, error } = await supabase
        .from('drivers_enhanced')
        .update({
          salary: payrollData.salary,
          pay_rate: payrollData.pay_rate,
          pay_type: payrollData.pay_type,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', payrollData.employee_id)
        .select();

      if (error) {
        return NextResponse.json(
          createApiResponse(false, null, error.message),
          { status: 400 }
        );
      }

      return NextResponse.json(
        createApiResponse(true, data, undefined, 'Payroll data updated successfully')
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }

  // POST /api/v1/webhooks/dispatch-assignment - Receive dispatch assignments
  static async handleDispatchAssignment(dispatchData: any) {
    try {
      // Log dispatch assignment (could create trips table if needed)
      const logData = {
        driver_id: dispatchData.driver_id,
        load_id: dispatchData.load_id,
        pickup_location: dispatchData.pickup_location,
        delivery_location: dispatchData.delivery_location,
        scheduled_pickup: dispatchData.scheduled_pickup,
        scheduled_delivery: dispatchData.scheduled_delivery,
        miles: dispatchData.miles,
        created_at: new Date().toISOString()
      };

      // In production, you'd have a trips or assignments table
      // For now, just acknowledge the webhook
      
      return NextResponse.json(
        createApiResponse(true, logData, undefined, 'Dispatch assignment received')
      );
    } catch (err) {
      return NextResponse.json(
        createApiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  }
}

// Export all API classes
export {
  DriverAPI,
  PerformanceAPI,
  ComplianceAPI,
  OnboardingAPI,
  WebhookAPI,
  authenticateApiRequest,
  createApiResponse,
  getPaginationParams
};
>>>>>>> 34e73bd382610bff689903bedc8d62eed355fc8a
