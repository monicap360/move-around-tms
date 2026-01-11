import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const { data: templates, error } = await supabaseAdmin
      .from("ticket_templates")
      .select(
        `
        *,
        template_fields (*)
      `,
      )
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch templates", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      partner_name,
      template_fields = [],
      base_image_url,
      is_active = true,
    } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 },
      );
    }

    // Create the template
    const { data: template, error: templateError } = await supabaseAdmin
      .from("ticket_templates")
      .insert([
        {
          name,
          description,
          partner_name,
          base_image_url,
          is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (templateError) {
      console.error("Template creation error:", templateError);
      return NextResponse.json(
        { error: "Failed to create template", details: templateError.message },
        { status: 500 },
      );
    }

    // Create template fields if provided
    if (template_fields.length > 0) {
      const fieldsWithTemplateId = template_fields.map((field: any) => ({
        ...field,
        template_id: template.id,
        created_at: new Date().toISOString(),
      }));

      const { error: fieldsError } = await supabaseAdmin
        .from("template_fields")
        .insert(fieldsWithTemplateId);

      if (fieldsError) {
        console.error("Fields creation error:", fieldsError);
        // Continue without failing the whole operation
      }
    }

    // Fetch the complete template with fields
    const { data: completeTemplate, error: fetchError } = await supabaseAdmin
      .from("ticket_templates")
      .select(
        `
        *,
        template_fields (*)
      `,
      )
      .eq("id", template.id)
      .single();

    if (fetchError) {
      console.error("Template fetch error:", fetchError);
      return NextResponse.json({ template }, { status: 201 });
    }

    return NextResponse.json({ template: completeTemplate }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
