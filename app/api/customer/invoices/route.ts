import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('invoices')
      .select(`
        id,
        load_request_id,
        customer_id,
        amount,
        status,
        due_date,
        paid_date,
        created_at,
        load_requests (
          id,
          commodity,
          origin_city,
          origin_state,
          destination_city,
          destination_state
        )
      `);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    // Transform data for frontend
    const transformedData = data?.map((invoice: any) => ({
      id: invoice.id,
      loadRequestId: invoice.load_request_id,
      amount: invoice.amount,
      status: invoice.status,
      dueDate: invoice.due_date,
      paidDate: invoice.paid_date,
      createdAt: invoice.created_at,
      loadInfo: invoice.load_requests ? {
        commodity: (invoice.load_requests as any).commodity,
        route: `${(invoice.load_requests as any).origin_city}, ${(invoice.load_requests as any).origin_state} → ${(invoice.load_requests as any).destination_city}, ${(invoice.load_requests as any).destination_state}`
      } : null
    }));

    return NextResponse.json(transformedData || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, status, paidDate } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (paidDate) updateData.paid_date = paidDate;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}