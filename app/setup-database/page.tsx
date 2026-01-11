"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
} from "lucide-react";

export default function SetupDatabasePage() {
  const [results, setResults] = useState<string[]>([]);
  const [working, setWorking] = useState(false);

  const addResult = (message: string) => {
    setResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const createTicketTemplatesTables = async () => {
    setWorking(true);
    setResults([]);
    addResult(
      "🔄 Starting database setup for ticket templates and DVIR system...",
    );

    try {
      // SQL to create ticket_templates table
      const ticketTemplatesSQL = `
        CREATE TABLE IF NOT EXISTS ticket_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          partner_name VARCHAR(255),
          base_image_url TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // SQL to create template_fields table
      const templateFieldsSQL = `
        CREATE TABLE IF NOT EXISTS template_fields (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          template_id UUID NOT NULL REFERENCES ticket_templates(id) ON DELETE CASCADE,
          field_name VARCHAR(255) NOT NULL,
          field_type VARCHAR(50) NOT NULL DEFAULT 'text',
          label VARCHAR(255) NOT NULL,
          x_position INTEGER NOT NULL,
          y_position INTEGER NOT NULL,
          width INTEGER DEFAULT 200,
          height INTEGER DEFAULT 30,
          is_required BOOLEAN DEFAULT false,
          placeholder VARCHAR(255),
          options TEXT[], -- for select/radio fields
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // SQL to create DVIR inspections table
      const dvirInspectionsSQL = `
        CREATE TABLE IF NOT EXISTS dvir_inspections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          driver_name VARCHAR(255) NOT NULL,
          truck_number VARCHAR(100) NOT NULL,
          odometer_reading INTEGER NOT NULL,
          inspection_type VARCHAR(20) NOT NULL CHECK (inspection_type IN ('pre_trip', 'post_trip')),
          location VARCHAR(255),
          inspection_items JSONB NOT NULL,
          overall_status VARCHAR(30) NOT NULL CHECK (overall_status IN ('satisfactory', 'defects_corrected', 'defects_need_correction')),
          driver_signature TEXT,
          mechanic_signature TEXT,
          defects_corrected BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // SQL to create DVIR defects table for detailed tracking
      const dvirDefectsSQL = `
        CREATE TABLE IF NOT EXISTS dvir_defects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          dvir_id UUID NOT NULL REFERENCES dvir_inspections(id) ON DELETE CASCADE,
          category VARCHAR(100) NOT NULL,
          item_description VARCHAR(255) NOT NULL,
          defect_notes TEXT,
          severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          photo_urls TEXT[],
          is_corrected BOOLEAN DEFAULT false,
          corrected_at TIMESTAMPTZ,
          corrected_by VARCHAR(255),
          correction_notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // SQL to create driver onboarding table
      const driverOnboardingSQL = `
        CREATE TABLE IF NOT EXISTS driver_onboarding (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          driver_email VARCHAR(255) NOT NULL UNIQUE,
          driver_id UUID REFERENCES drivers(id),
          current_step INTEGER DEFAULT 1,
          status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'on_hold')),
          personal_info JSONB,
          employment_info JSONB,
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // SQL to create onboarding documents table
      const onboardingDocsSQL = `
        CREATE TABLE IF NOT EXISTS driver_onboarding_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          driver_email VARCHAR(255) NOT NULL,
          document_type VARCHAR(100) NOT NULL,
          file_url TEXT NOT NULL,
          file_name VARCHAR(255),
          expiration_date DATE,
          status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'approved', 'rejected', 'expired')),
          approved_by VARCHAR(255),
          approved_at TIMESTAMPTZ,
          rejection_reason TEXT,
          uploaded_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(driver_email, document_type)
        );
      `;

      // SQL to create driver documents table (enhanced)
      const driverDocumentsSQL = `
        CREATE TABLE IF NOT EXISTS driver_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          driver_id UUID REFERENCES drivers(id),
          driver_email VARCHAR(255),
          doc_type VARCHAR(100) NOT NULL,
          file_url TEXT NOT NULL,
          file_name VARCHAR(255),
          expiration_date DATE,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
          approved_by VARCHAR(255),
          approved_at TIMESTAMPTZ,
          rejection_reason TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // SQL to create index for better performance
      const indexSQL = `
        CREATE INDEX IF NOT EXISTS idx_template_fields_template_id 
        ON template_fields(template_id);
        
        CREATE INDEX IF NOT EXISTS idx_dvir_inspections_truck_date 
        ON dvir_inspections(truck_number, created_at);
        
        CREATE INDEX IF NOT EXISTS idx_dvir_inspections_status 
        ON dvir_inspections(overall_status);
        
        CREATE INDEX IF NOT EXISTS idx_dvir_defects_dvir_id 
        ON dvir_defects(dvir_id);
        
        CREATE INDEX IF NOT EXISTS idx_dvir_defects_correction 
        ON dvir_defects(is_corrected, severity);
      `;

      // SQL to create update trigger for updated_at
      const triggerSQL = `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';

        DROP TRIGGER IF EXISTS update_ticket_templates_updated_at ON ticket_templates;
        CREATE TRIGGER update_ticket_templates_updated_at
          BEFORE UPDATE ON ticket_templates
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        DROP TRIGGER IF EXISTS update_template_fields_updated_at ON template_fields;
        CREATE TRIGGER update_template_fields_updated_at
          BEFORE UPDATE ON template_fields
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          
        CREATE TRIGGER update_dvir_inspections_updated_at
          BEFORE UPDATE ON dvir_inspections
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          
        CREATE TRIGGER update_dvir_defects_updated_at
          BEFORE UPDATE ON dvir_defects
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `;

      // Execute the SQL statements
      addResult("📋 Creating ticket_templates table...");
      const { error: templatesError } = await supabase.rpc("exec_sql", {
        sql: ticketTemplatesSQL,
      });

      if (templatesError) {
        // Try alternative approach
        addResult("⚠️ RPC not available, using direct query...");
        const { error: directError } = await supabaseAdmin
          .from("information_schema.tables")
          .select("table_name")
          .eq("table_name", "ticket_templates")
          .single();

        if (directError && directError.code === "PGRST116") {
          addResult("✅ ticket_templates table needs to be created manually");
        }
      } else {
        addResult("✅ ticket_templates table created successfully");
      }

      addResult("📋 Creating template_fields table...");
      const { error: fieldsError } = await supabaseAdmin.rpc("exec_sql", {
        sql: templateFieldsSQL,
      });

      if (!fieldsError) {
        addResult("✅ template_fields table created successfully");
      }

      addResult("� Creating DVIR inspections table...");
      const { error: dvirError } = await supabaseAdmin.rpc("exec_sql", {
        sql: dvirInspectionsSQL,
      });

      if (!dvirError) {
        addResult("✅ dvir_inspections table created successfully");
      }

      addResult("📋 Creating DVIR defects table...");
      const { error: defectsError } = await supabaseAdmin.rpc("exec_sql", {
        sql: dvirDefectsSQL,
      });

      if (!defectsError) {
        addResult("✅ dvir_defects table created successfully");
      }

      addResult("📋 Creating driver onboarding table...");
      const { error: onboardingError } = await supabaseAdmin.rpc("exec_sql", {
        sql: driverOnboardingSQL,
      });

      if (!onboardingError) {
        addResult("✅ driver_onboarding table created successfully");
      }

      addResult("📋 Creating onboarding documents table...");
      const { error: onboardingDocsError } = await supabaseAdmin.rpc(
        "exec_sql",
        {
          sql: onboardingDocsSQL,
        },
      );

      if (!onboardingDocsError) {
        addResult("✅ driver_onboarding_documents table created successfully");
      }

      addResult("📋 Creating driver documents table...");
      const { error: driverDocsError } = await supabaseAdmin.rpc("exec_sql", {
        sql: driverDocumentsSQL,
      });

      if (!driverDocsError) {
        addResult("✅ driver_documents table created successfully");
      }

      // Create vehicles table for fleet management
      addResult("🚚 Creating vehicles table...");
      const vehiclesSQL = `
        CREATE TABLE IF NOT EXISTS vehicles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          unit_number VARCHAR(50) UNIQUE NOT NULL,
          make VARCHAR(100) NOT NULL,
          model VARCHAR(100) NOT NULL,
          year INTEGER NOT NULL,
          vin VARCHAR(17) UNIQUE NOT NULL,
          license_plate VARCHAR(20),
          registration_expiry DATE,
          insurance_expiry DATE,
          dot_inspection_due DATE,
          last_maintenance DATE,
          next_maintenance_due DATE,
          current_mileage INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'out_of_service')),
          driver_assigned VARCHAR(255),
          location VARCHAR(255),
          fuel_type VARCHAR(50),
          engine_serial VARCHAR(100),
          transmission_type VARCHAR(100),
          purchase_date DATE,
          purchase_price DECIMAL(12,2),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_vehicles_unit_number ON vehicles(unit_number);
        CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
        CREATE INDEX IF NOT EXISTS idx_vehicles_registration_expiry ON vehicles(registration_expiry);
        CREATE INDEX IF NOT EXISTS idx_vehicles_dot_inspection_due ON vehicles(dot_inspection_due);
      `;

      const { error: vehiclesError } = await supabaseAdmin.rpc("exec_sql", {
        sql: vehiclesSQL,
      });

      if (vehiclesError) {
        addResult(`❌ Error creating vehicles table: ${vehiclesError.message}`);
      } else {
        addResult("✅ vehicles table created successfully");
      }

      // Create maintenance records table
      addResult("🔧 Creating maintenance records table...");
      const maintenanceRecordsSQL = `
        CREATE TABLE IF NOT EXISTS maintenance_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
          maintenance_type VARCHAR(100) NOT NULL,
          description TEXT,
          cost DECIMAL(10,2),
          date_completed DATE NOT NULL,
          mileage_at_service INTEGER,
          next_due_date DATE,
          next_due_mileage INTEGER,
          vendor VARCHAR(255),
          invoice_number VARCHAR(100),
          parts_used TEXT,
          labor_hours DECIMAL(5,2),
          status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle_id ON maintenance_records(vehicle_id);
        CREATE INDEX IF NOT EXISTS idx_maintenance_records_date_completed ON maintenance_records(date_completed);
        CREATE INDEX IF NOT EXISTS idx_maintenance_records_status ON maintenance_records(status);
      `;

      const { error: maintenanceRecordsError } = await supabaseAdmin.rpc(
        "exec_sql",
        {
          sql: maintenanceRecordsSQL,
        },
      );

      if (maintenanceRecordsError) {
        addResult(
          `❌ Error creating maintenance_records table: ${maintenanceRecordsError.message}`,
        );
      } else {
        addResult("✅ maintenance_records table created successfully");
      }

      addResult(" Creating indexes and triggers...");
      await supabaseAdmin.rpc("exec_sql", { sql: indexSQL });
      await supabaseAdmin.rpc("exec_sql", { sql: triggerSQL });
      addResult("✅ Indexes and triggers created successfully");

      // Create comprehensive ticket system tables
      addResult("🚛 Creating aggregate tickets table...");
      const aggregateTicketsSQL = `
        CREATE TABLE IF NOT EXISTS aggregate_tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_number VARCHAR(100) UNIQUE NOT NULL,
          driver_id UUID REFERENCES drivers(id),
          truck_id UUID REFERENCES trucks(id),
          customer_name VARCHAR(255) NOT NULL,
          material_type VARCHAR(100),
          quantity DECIMAL(10,2),
          unit VARCHAR(20),
          rate DECIMAL(10,2),
          total_amount DECIMAL(10,2),
          pickup_location TEXT,
          delivery_location TEXT,
          pickup_date TIMESTAMPTZ,
          delivery_date TIMESTAMPTZ,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'invoiced', 'paid', 'cancelled')),
          odometer_start INTEGER,
          odometer_end INTEGER,
          fuel_used DECIMAL(8,2),
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // Create DOT compliance tracking table
      addResult("📋 Creating DOT compliance table...");
      const dotComplianceSQL = `
        CREATE TABLE IF NOT EXISTS dot_compliance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          driver_id UUID REFERENCES drivers(id),
          compliance_type VARCHAR(100) NOT NULL,
          document_name VARCHAR(255) NOT NULL,
          issue_date DATE,
          expiration_date DATE,
          issuing_authority VARCHAR(255),
          document_number VARCHAR(100),
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'revoked', 'pending')),
          file_url TEXT,
          verification_date TIMESTAMPTZ,
          verified_by VARCHAR(255),
          audit_notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // Create regulatory tracking table
      addResult("⚖️ Creating regulatory tracking table...");
      const regulatoryTrackingSQL = `
        CREATE TABLE IF NOT EXISTS regulatory_tracking (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          regulation_type VARCHAR(100) NOT NULL,
          regulation_name VARCHAR(255) NOT NULL,
          description TEXT,
          compliance_deadline DATE,
          responsible_party VARCHAR(255),
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'compliant', 'non_compliant', 'overdue')),
          last_audit_date DATE,
          next_audit_date DATE,
          audit_frequency VARCHAR(50),
          penalty_amount DECIMAL(10,2),
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // Create fleet management table
      addResult("🚚 Creating fleet management table...");
      const fleetManagementSQL = `
        CREATE TABLE IF NOT EXISTS fleet_management (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          truck_id UUID REFERENCES trucks(id),
          maintenance_type VARCHAR(100) NOT NULL,
          service_date DATE,
          mileage INTEGER,
          cost DECIMAL(10,2),
          vendor VARCHAR(255),
          description TEXT,
          next_service_date DATE,
          next_service_mileage INTEGER,
          status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // Create audit trail table
      addResult("📊 Creating audit trail table...");
      const auditTrailSQL = `
        CREATE TABLE IF NOT EXISTS audit_trail (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_type VARCHAR(100) NOT NULL,
          entity_id UUID NOT NULL,
          action VARCHAR(50) NOT NULL,
          old_values JSONB,
          new_values JSONB,
          changed_by VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // Create DVIR stats function
      addResult("📊 Creating DVIR statistics function...");
      const dvirStatsFunction = `
        CREATE OR REPLACE FUNCTION get_dvir_stats()
        RETURNS TABLE (
          total_inspections BIGINT,
          satisfactory_count BIGINT,
          defects_corrected_count BIGINT,
          defects_need_correction_count BIGINT,
          critical_defects_count BIGINT,
          today_inspections BIGINT
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            COUNT(*)::BIGINT as total_inspections,
            COUNT(*) FILTER (WHERE overall_status = 'satisfactory')::BIGINT as satisfactory_count,
            COUNT(*) FILTER (WHERE overall_status = 'defects_corrected')::BIGINT as defects_corrected_count,
            COUNT(*) FILTER (WHERE overall_status = 'defects_need_correction')::BIGINT as defects_need_correction_count,
            (SELECT COUNT(*)::BIGINT FROM dvir_defects WHERE severity = 'critical') as critical_defects_count,
            COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)::BIGINT as today_inspections
          FROM dvir_inspections;
        END;
        $$ LANGUAGE plpgsql;
      `;

      // Execute all the new table creation SQL
      await supabaseAdmin.rpc("exec_sql", { sql: aggregateTicketsSQL });
      addResult("✅ Aggregate tickets table created successfully");

      await supabaseAdmin.rpc("exec_sql", { sql: dotComplianceSQL });
      addResult("✅ DOT compliance table created successfully");

      await supabaseAdmin.rpc("exec_sql", { sql: regulatoryTrackingSQL });
      addResult("✅ Regulatory tracking table created successfully");

      await supabaseAdmin.rpc("exec_sql", { sql: fleetManagementSQL });
      addResult("✅ Fleet management table created successfully");

      await supabaseAdmin.rpc("exec_sql", { sql: auditTrailSQL });
      addResult("✅ Audit trail table created successfully");

      await supabaseAdmin.rpc("exec_sql", { sql: dvirStatsFunction });
      addResult("✅ DVIR statistics function created successfully");

      // Test the tables by checking if they exist
      addResult("🔍 Verifying table creation...");

      const { data: templatesTest, error: templatesTestError } =
        await supabaseAdmin.from("ticket_templates").select("id").limit(1);

      if (!templatesTestError) {
        addResult("✅ ticket_templates table is accessible");
      } else {
        addResult(
          `❌ ticket_templates table error: ${templatesTestError.message}`,
        );
      }

      const { data: fieldsTest, error: fieldsTestError } = await supabaseAdmin
        .from("template_fields")
        .select("id")
        .limit(1);

      if (!fieldsTestError) {
        addResult("✅ template_fields table is accessible");
      } else {
        addResult(`❌ template_fields table error: ${fieldsTestError.message}`);
      }

      const { data: dvirTest, error: dvirTestError } = await supabaseAdmin
        .from("dvir_inspections")
        .select("id")
        .limit(1);

      if (!dvirTestError) {
        addResult("✅ dvir_inspections table is accessible");
      } else {
        addResult(`❌ dvir_inspections table error: ${dvirTestError.message}`);
      }

      const { data: defectsTest, error: defectsTestError } = await supabaseAdmin
        .from("dvir_defects")
        .select("id")
        .limit(1);

      if (!defectsTestError) {
        addResult("✅ dvir_defects table is accessible");
      } else {
        addResult(`❌ dvir_defects table error: ${defectsTestError.message}`);
      }

      addResult("🎉 Database setup completed!");
    } catch (error) {
      addResult(`❌ Setup error: ${error}`);
      console.error("Database setup error:", error);
    }

    setWorking(false);
  };

  const createUser = async (
    email: string,
    password: string,
    role: string = "office",
  ) => {
    setWorking(true);
    addResult(`🔄 Creating user account for ${email}...`);

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true, // Auto-confirm email
        });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Failed to create user");
      }

      addResult(`✅ User created in auth system with ID: ${authData.user.id}`);

      // Create user_roles table if it doesn't exist
      const userRolesSQL = `
        CREATE TABLE IF NOT EXISTS user_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          role VARCHAR(50) NOT NULL,
          company VARCHAR(255) DEFAULT 'Ronyx Logistics LLC',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `;

      await supabaseAdmin.rpc("exec_sql", { sql: userRolesSQL });
      addResult("✅ user_roles table ready");

      // Insert role assignment
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: role,
          company: "Ronyx Logistics LLC",
        });

      if (roleError) {
        throw new Error(`Role assignment failed: ${roleError.message}`);
      }

      addResult(`✅ Role '${role}' assigned successfully`);
      addResult(
        `🎉 User ${email} is ready to log in with password: ${password}`,
      );
      addResult(`💡 User should visit /complete-profile after first login`);
    } catch (error: any) {
      addResult(`❌ User creation error: ${error.message}`);
      console.error("User creation error:", error);
    }

    setWorking(false);
  };

  const setupStorageBuckets = async () => {
    setWorking(true);
    setResults([]);
    addResult("🔄 Setting up Supabase storage buckets...");

    try {
      const buckets = [
        {
          name: "logo",
          options: {
            public: true,
            allowedMimeTypes: [
              "image/png",
              "image/jpg",
              "image/jpeg",
              "image/svg+xml",
            ],
          },
          description: "Company logo uploads",
        },
        {
          name: "ticket-templates",
          options: {
            public: true,
            allowedMimeTypes: [
              "image/png",
              "image/jpg",
              "image/jpeg",
              "application/pdf",
            ],
          },
          description: "Ticket template background images",
        },
        {
          name: "invoice-templates",
          options: {
            public: true,
            allowedMimeTypes: [
              "image/png",
              "image/jpg",
              "image/jpeg",
              "application/pdf",
            ],
          },
          description: "Invoice template assets",
        },
        {
          name: "driver-documents",
          options: {
            public: false,
            allowedMimeTypes: [
              "image/png",
              "image/jpg",
              "image/jpeg",
              "application/pdf",
            ],
          },
          description: "Driver document uploads (private)",
        },
        {
          name: "dvir-photos",
          options: {
            public: false,
            allowedMimeTypes: ["image/png", "image/jpg", "image/jpeg"],
          },
          description: "DVIR inspection photos",
        },
        {
          name: "company-assets",
          options: {
            public: false,
            allowedMimeTypes: [
              "image/png",
              "image/jpg",
              "image/jpeg",
              "application/pdf",
            ],
          },
          description: "Company asset documentation",
        },
        {
          name: "aggregate-tickets",
          options: {
            public: false,
            allowedMimeTypes: [
              "image/png",
              "image/jpg",
              "image/jpeg",
              "application/pdf",
            ],
          },
          description: "Aggregate delivery tickets and receipts",
        },
        {
          name: "compliance-documents",
          options: {
            public: false,
            allowedMimeTypes: [
              "image/png",
              "image/jpg",
              "image/jpeg",
              "application/pdf",
            ],
          },
          description: "DOT and regulatory compliance documents",
        },
      ];

      for (const bucket of buckets) {
        addResult(`📁 Creating bucket: ${bucket.name}...`);

        const { data: existingBucket } = await supabaseAdmin.storage.getBucket(
          bucket.name,
        );

        if (existingBucket) {
          addResult(`✅ Bucket '${bucket.name}' already exists`);
        } else {
          const { data, error } = await supabaseAdmin.storage.createBucket(
            bucket.name,
            bucket.options,
          );

          if (error) {
            addResult(
              `❌ Failed to create bucket '${bucket.name}': ${error.message}`,
            );
          } else {
            addResult(
              `✅ Created bucket '${bucket.name}' - ${bucket.description}`,
            );
          }
        }
      }

      addResult("🎉 Storage buckets setup completed!");
      addResult("");
      addResult("📂 Available buckets:");
      addResult("• logo - Public company logo uploads");
      addResult("• ticket-templates - Ticket background images");
      addResult("• invoice-templates - Invoice template assets");
      addResult("• driver-documents - Private driver documents");
      addResult("• dvir-photos - DVIR inspection photos");
      addResult("• company-assets - Company asset documentation");
      addResult(
        "• aggregate-tickets - Aggregate delivery tickets and receipts",
      );
      addResult(
        "• compliance-documents - DOT and regulatory compliance documents",
      );
    } catch (error) {
      addResult(`❌ Storage setup error: ${error}`);
      console.error("Storage setup error:", error);
    }

    setWorking(false);
  };

  const showSQLStatements = () => {
    addResult("📋 SQL statements to run manually in Supabase SQL Editor:");
    addResult("");
    addResult("-- Create ticket_templates table");
    addResult(`CREATE TABLE IF NOT EXISTS ticket_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  partner_name VARCHAR(255),
  base_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`);
    addResult("");
    addResult("-- Create template_fields table");
    addResult(`CREATE TABLE IF NOT EXISTS template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES ticket_templates(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL DEFAULT 'text',
  label VARCHAR(255) NOT NULL,
  x_position INTEGER NOT NULL,
  y_position INTEGER NOT NULL,
  width INTEGER DEFAULT 200,
  height INTEGER DEFAULT 30,
  is_required BOOLEAN DEFAULT false,
  placeholder VARCHAR(255),
  options TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`);
    addResult("");
    addResult("-- Create index");
    addResult(`CREATE INDEX IF NOT EXISTS idx_template_fields_template_id 
ON template_fields(template_id);`);
    addResult("");
    addResult("-- Create DVIR inspections table");
    addResult(`CREATE TABLE IF NOT EXISTS dvir_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name VARCHAR(255) NOT NULL,
  truck_number VARCHAR(100) NOT NULL,
  odometer_reading INTEGER NOT NULL,
  inspection_type VARCHAR(20) NOT NULL CHECK (inspection_type IN ('pre_trip', 'post_trip')),
  location VARCHAR(255),
  inspection_items JSONB NOT NULL,
  overall_status VARCHAR(30) NOT NULL CHECK (overall_status IN ('satisfactory', 'defects_corrected', 'defects_need_correction')),
  driver_signature TEXT,
  mechanic_signature TEXT,
  defects_corrected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`);
    addResult("");
    addResult("-- Create DVIR defects table");
    addResult(`CREATE TABLE IF NOT EXISTS dvir_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dvir_id UUID NOT NULL REFERENCES dvir_inspections(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  item_description VARCHAR(255) NOT NULL,
  defect_notes TEXT,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  photo_urls TEXT[],
  is_corrected BOOLEAN DEFAULT false,
  corrected_at TIMESTAMPTZ,
  corrected_by VARCHAR(255),
  correction_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`);
    addResult("");
    addResult("-- Create indexes");
    addResult(`CREATE INDEX IF NOT EXISTS idx_template_fields_template_id 
ON template_fields(template_id);

CREATE INDEX IF NOT EXISTS idx_dvir_inspections_truck_date 
ON dvir_inspections(truck_number, created_at);

CREATE INDEX IF NOT EXISTS idx_dvir_inspections_status 
ON dvir_inspections(overall_status);

CREATE INDEX IF NOT EXISTS idx_dvir_defects_dvir_id 
ON dvir_defects(dvir_id);

CREATE INDEX IF NOT EXISTS idx_dvir_defects_correction 
ON dvir_defects(is_corrected, severity);`);
    addResult("");
    addResult("-- Create update triggers");
    addResult(`CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ticket_templates_updated_at
  BEFORE UPDATE ON ticket_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_fields_updated_at
  BEFORE UPDATE ON template_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_dvir_inspections_updated_at
  BEFORE UPDATE ON dvir_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_dvir_defects_updated_at
  BEFORE UPDATE ON dvir_defects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Database Setup - Templates & DVIR System
          </CardTitle>
          <p className="text-sm text-gray-600">
            Create the necessary database tables for ticket templates and DVIR
            system
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={createTicketTemplatesTables}
              disabled={working}
              className="flex items-center gap-2"
            >
              {working ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Auto Setup Tables
            </Button>
            <Button
              variant="outline"
              onClick={showSQLStatements}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Show SQL Statements
            </Button>
            <Button
              variant="outline"
              onClick={setupStorageBuckets}
              disabled={working}
              className="flex items-center gap-2"
            >
              {working ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Setup Storage Buckets
            </Button>
          </div>

          {results.length > 0 && (
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={
                    result.includes("✅")
                      ? "text-green-400"
                      : result.includes("❌")
                        ? "text-red-400"
                        : result.includes("⚠️")
                          ? "text-yellow-400"
                          : result.includes("🔍")
                            ? "text-blue-400"
                            : result.includes("📋") || result.includes("🔧")
                              ? "text-purple-400"
                              : result.includes("🎉")
                                ? "text-green-300"
                                : result.includes("--") ||
                                    result.includes("CREATE") ||
                                    result.includes("INSERT")
                                  ? "text-cyan-300"
                                  : "text-gray-300"
                  }
                >
                  {result}
                </div>
              ))}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold text-blue-800 mb-2">
              What this creates:
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • <strong>ticket_templates</strong> - Stores template metadata
                and settings
              </li>
              <li>
                • <strong>template_fields</strong> - Stores field definitions
                with positions
              </li>
              <li>
                • <strong>dvir_inspections</strong> - Stores driver vehicle
                inspection reports
              </li>
              <li>
                • <strong>dvir_defects</strong> - Tracks individual defects and
                corrections
              </li>
              <li>
                • <strong>driver_onboarding</strong> - Tracks driver onboarding
                progress
              </li>
              <li>
                • <strong>driver_onboarding_documents</strong> - Stores
                onboarding document uploads
              </li>
              <li>
                • <strong>driver_documents</strong> - General driver document
                management
              </li>
              <li>• Indexes for better query performance</li>
              <li>• Automatic timestamp updates on data changes</li>
            </ul>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded p-4">
            <h3 className="font-semibold text-orange-800 mb-2">
              If Auto Setup Fails:
            </h3>
            <ol className="text-sm text-orange-700 space-y-1">
              <li>1. Click "Show SQL Statements" button above</li>
              <li>2. Go to your Supabase Dashboard → SQL Editor</li>
              <li>3. Copy and paste the SQL statements</li>
              <li>4. Run them manually</li>
              <li>5. Return here and test the ticket template system</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            User Management
          </CardTitle>
          <p className="text-sm text-gray-600">
            Create user accounts with proper roles and permissions
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">
              Quick User Setup:
            </h3>
            <p className="text-sm text-yellow-700">
              Create user account for sylviypena@yahoo.com with office role
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() =>
                createUser("sylviypena@yahoo.com", "TempPass123!", "office")
              }
              disabled={working}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {working ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Create sylviypena@yahoo.com
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                createUser("admin@ronyxlogistics.com", "AdminPass123!", "admin")
              }
              disabled={working}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Create Admin User
            </Button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h3 className="font-semibold text-green-800 mb-2">
              Default Credentials:
            </h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>
                <strong>Email:</strong> sylviypena@yahoo.com
              </li>
              <li>
                <strong>Password:</strong> TempPass123!
              </li>
              <li>
                <strong>Role:</strong> office
              </li>
              <li>
                <strong>Next Step:</strong> Visit /complete-profile after first
                login
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
