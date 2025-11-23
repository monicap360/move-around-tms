import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: template, error } = await supabaseAdmin
      .from('ticket_templates')
      .select(`
        *,
        template_fields (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Template not found', details: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      partner_name,
      template_fields = [],
      base_image_url,
      is_active
    } = body;

    // Update template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('ticket_templates')
      .update({
        name,
        description,
        partner_name,
        base_image_url,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (templateError) {
      console.error('Template update error:', templateError);
      return NextResponse.json(
        { error: 'Failed to update template', details: templateError.message },
        { status: 500 }
      );
    }

    // Delete existing fields
    await supabaseAdmin
      .from('template_fields')
      .delete()
      .eq('template_id', id);

    // Insert new fields
    if (template_fields.length > 0) {
      const fieldsWithTemplateId = template_fields.map((field: any) => ({
        ...field,
        template_id: id,
        created_at: new Date().toISOString()
      }));

      const { error: fieldsError } = await supabaseAdmin
        .from('template_fields')
        .insert(fieldsWithTemplateId);

      if (fieldsError) {
        console.error('Fields update error:', fieldsError);
      }
    }

    // Fetch updated template with fields
    const { data: completeTemplate, error: fetchError } = await supabaseAdmin
      .from('ticket_templates')
      .select(`
        *,
        template_fields (*)
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({ template: completeTemplate || template });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete template fields first
    await supabaseAdmin
      .from('template_fields')
      .delete()
      .eq('template_id', id);

    // Delete template
    const { error } = await supabaseAdmin
      .from('ticket_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Template deletion error:', error);
      return NextResponse.json(
        { error: 'Failed to delete template', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Template deleted successfully' });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}