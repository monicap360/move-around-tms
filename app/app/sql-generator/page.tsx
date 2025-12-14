"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

interface SQLCommand {
  title: string;
  description: string;
  sql: string;
  risk: 'low' | 'medium' | 'high';
  required: boolean;
}

interface Scenario {
  name: string;
  description: string;
  conditions: string[];
  commands: SQLCommand[];
}

export default function SQLCommandGeneratorPage() {
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [copiedCommand, setCopiedCommand] = useState<string>('');

  const scenarios: Scenario[] = [
    {
      name: "standard-postgres",
      description: "Standard Setup - You have 'postgres' role",
      conditions: [
        "Diagnostic shows current_user = 'postgres'",
        "You have basic admin access",
        "No existing ownership conflicts"
      ],
      commands: [
        {
          title: "1. Verify Current Role",
          description: "Confirm you're running as postgres user",
          sql: "select current_user, session_user;",
          risk: 'low',
          required: true
        },
        {
          title: "2. Grant Schema Permissions",
          description: "Ensure postgres has necessary schema access",
          sql: `-- Grant necessary permissions on storage schema
grant usage on schema storage to postgres;
grant create on schema storage to postgres;
grant all privileges on schema storage to postgres;`,
          risk: 'low',
          required: true
        },
        {
          title: "3. Transfer Table Ownership",
          description: "Transfer ownership to supabase_admin for index creation",
          sql: `-- Transfer ownership to supabase_admin
alter table storage.objects owner to supabase_admin;

-- Verify ownership change
select tableowner from pg_tables 
where schemaname = 'storage' and tablename = 'objects';`,
          risk: 'medium',
          required: true
        },
        {
          title: "4. Create Performance Index",
          description: "Create the index for faster folder-based queries",
          sql: `-- Create the performance index
create index if not exists idx_storage_objects_company_assets_userfolder
  on storage.objects (split_part(name, '/', 1))
  where bucket_id = 'company_assets';`,
          risk: 'low',
          required: true
        },
        {
          title: "5. Optimize Table Statistics",
          description: "Update table statistics for optimal query planning",
          sql: `-- Update table statistics
analyze storage.objects;

-- Verify index was created
select indexname, indexdef from pg_indexes 
where schemaname = 'storage' and tablename = 'objects'
and indexname = 'idx_storage_objects_company_assets_userfolder';`,
          risk: 'low',
          required: false
        }
      ]
    },
    {
      name: "supabase-admin",
      description: "Admin Role Setup - You have 'supabase_admin' access",
      conditions: [
        "You can switch to supabase_admin role",
        "You have elevated privileges",
        "Need to bypass ownership restrictions"
      ],
      commands: [
        {
          title: "1. Switch to Admin Role",
          description: "Switch to the supabase_admin role for full privileges",
          sql: `-- Switch to admin role
set role supabase_admin;

-- Confirm role switch
select current_user, session_user;`,
          risk: 'medium',
          required: true
        },
        {
          title: "2. Direct Index Creation",
          description: "Create index directly as supabase_admin (skips ownership transfer)",
          sql: `-- Create index directly with admin privileges
create index if not exists idx_storage_objects_company_assets_userfolder
  on storage.objects (split_part(name, '/', 1))
  where bucket_id = 'company_assets';`,
          risk: 'low',
          required: true
        },
        {
          title: "3. Verify and Optimize",
          description: "Confirm index creation and update statistics",
          sql: `-- Verify index exists
select indexname, indexdef from pg_indexes 
where indexname = 'idx_storage_objects_company_assets_userfolder';

-- Update table statistics
analyze storage.objects;`,
          risk: 'low',
          required: false
        }
      ]
    },
    {
      name: "permission-denied",
      description: "Permission Denied - Limited role access",
      conditions: [
        "Getting 'permission denied' errors",
        "Cannot transfer ownership",
        "Role has limited privileges"
      ],
      commands: [
        {
          title: "1. Check Available Roles",
          description: "See what roles are available to you",
          sql: `-- Check available roles
select rolname from pg_roles where pg_has_role(current_user, oid, 'member');

-- Check current privileges
select has_schema_privilege('storage', 'usage') as can_use_storage,
       has_schema_privilege('storage', 'create') as can_create_in_storage;`,
          risk: 'low',
          required: true
        },
        {
          title: "2. Try Alternative Role Switch",
          description: "Attempt to switch to a more privileged role",
          sql: `-- Try switching to various admin roles
-- (Only run ONE of these that works)

-- Option A: Try supabase_admin
set role supabase_admin;

-- Option B: Try service_role (if available)
-- set role service_role;

-- Option C: Try postgres (if different from current)
-- set role postgres;

-- Verify the switch worked
select current_user;`,
          risk: 'medium',
          required: true
        },
        {
          title: "3. Concurrent Index Creation",
          description: "Try creating index without ownership transfer",
          sql: `-- Attempt concurrent index creation (safer, may work with limited permissions)
create index concurrently if not exists idx_storage_objects_company_assets_userfolder
  on storage.objects (split_part(name, '/', 1))
  where bucket_id = 'company_assets';`,
          risk: 'low',
          required: true
        }
      ]
    },
    {
      name: "index-exists",
      description: "Index Already Exists - Just optimize",
      conditions: [
        "Diagnostic shows index already created",
        "Just need to update statistics",
        "Performance optimization needed"
      ],
      commands: [
        {
          title: "1. Verify Index Details",
          description: "Confirm the index exists and check its definition",
          sql: `-- Check if our index exists
select indexname, indexdef, schemaname, tablename 
from pg_indexes 
where indexname = 'idx_storage_objects_company_assets_userfolder';

-- Check index usage statistics
select schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
from pg_stat_user_indexes 
where indexname = 'idx_storage_objects_company_assets_userfolder';`,
          risk: 'low',
          required: true
        },
        {
          title: "2. Update Table Statistics",
          description: "Ensure Postgres knows about the index for optimal query planning",
          sql: `-- Update table statistics (helps query planner use the index)
analyze storage.objects;

-- Check that analyze completed
select schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, last_analyze
from pg_stat_user_tables 
where schemaname = 'storage' and tablename = 'objects';`,
          risk: 'low',
          required: true
        }
      ]
    }
  ];

  const copyToClipboard = async (text: string, commandTitle: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(commandTitle);
      setTimeout(() => setCopiedCommand(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const selectedScenarioData = scenarios.find(s => s.name === selectedScenario);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>SQL Command Generator</CardTitle>
          <p className="text-sm text-gray-600">
            Get the exact SQL commands to run based on your specific situation and diagnostic results
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((scenario) => (
              <div 
                key={scenario.name}
                className="cursor-pointer" 

              >
                <Card 
                  className={`transition-all ${
                    selectedScenario === scenario.name 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:border-gray-300'
                  }`}
                >
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">{scenario.description}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-medium">Choose this if:</p>
                    <ul className="list-disc list-inside text-xs">
                      {scenario.conditions.map((condition, idx) => (
                        <li key={idx}>{condition}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedScenarioData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>{selectedScenarioData.description}</span>
              <Badge variant="outline">{selectedScenarioData.commands.length} steps</Badge>
            </CardTitle>
            <p className="text-sm text-gray-600">
              Follow these commands in order. Copy each command and paste into Supabase SQL Editor.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {selectedScenarioData.commands.map((command, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{command.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{command.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge 
                          className={getRiskColor(command.risk)}
                          variant="outline"
                        >
                          {command.risk} risk
                        </Badge>
                        {command.required && (
                          <Badge variant="destructive">Required</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mt-3 relative">
                      <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                        {command.sql}
                      </pre>
                      <Button
                        size="sm"
                        className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
                        onClick={() => copyToClipboard(command.sql, command.title)}
                      >
                        {copiedCommand === command.title ? '✓ Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-800">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-700">
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Run diagnostics first:</strong> Use `/database-diagnostics` to determine which scenario applies to you</li>
            <li><strong>Copy exactly:</strong> Copy each command exactly as shown - including comments</li>
            <li><strong>Run in order:</strong> Execute commands in the order shown</li>
            <li><strong>Check results:</strong> Each command should return results - if you get errors, stop and report them</li>
            <li><strong>Test performance:</strong> After completion, use `/performance-test` to verify improvements</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
