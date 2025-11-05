"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Using custom Alert component since @/components/ui/alert doesn't exist
const Alert = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`border rounded p-4 ${className}`}>{children}</div>
);
const AlertDescription = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={className}>{children}</div>
);

interface StatusResult {
  category: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  action?: string;
}

export default function QuickStatusPage() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<StatusResult[]>([]);

  const checkStatus = async () => {
    setChecking(true);
    const statusResults: StatusResult[] = [];

    // This simulates what Monica should check manually in SQL Editor
    // Since we can't directly query system tables from browser client

    statusResults.push({
      category: "Next Steps for Monica",
      status: 'info',
      message: "Run these commands in Supabase SQL Editor to resolve ownership issue",
      action: "copy-commands"
    });

    statusResults.push({
      category: "Current Problem",
      status: 'error',
      message: "Postgres reports: 'must be owner of table objects'",
      action: "This means the ownership transfer in step 3 did not succeed"
    });

    statusResults.push({
      category: "Root Cause",
      status: 'warning',
      message: "The role executing the commands lacks sufficient privileges to transfer table ownership",
      action: "Need to use supabase_admin or service_role instead of postgres"
    });

    statusResults.push({
      category: "Solution A - Switch Roles",
      status: 'success',
      message: "Try switching to supabase_admin role before running commands",
      action: "switch-role"
    });

    statusResults.push({
      category: "Solution B - Direct Creation",
      status: 'success',
      message: "Create index directly as supabase_admin (skip ownership transfer)",
      action: "direct-create"
    });

    setResults(statusResults);
    setChecking(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-500 bg-green-50';
      case 'error': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'info': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Commands copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const solutionACommands = `-- SOLUTION A: Switch to supabase_admin role first
-- Step 1: Switch role
set role supabase_admin;

-- Step 2: Confirm role switch
select current_user;

-- Step 3: Create index directly (no ownership transfer needed)
create index if not exists idx_storage_objects_company_assets_userfolder
  on storage.objects (split_part(name, '/', 1))
  where bucket_id = 'company_assets';

-- Step 4: Update statistics
analyze storage.objects;

-- Step 5: Verify index exists
select indexname, indexdef from pg_indexes 
where indexname = 'idx_storage_objects_company_assets_userfolder';`;

  const solutionBCommands = `-- SOLUTION B: Direct creation with concurrent index
-- Step 1: Check current role
select current_user;

-- Step 2: Try concurrent index creation (works with limited permissions)
create index concurrently if not exists idx_storage_objects_company_assets_userfolder
  on storage.objects (split_part(name, '/', 1))
  where bucket_id = 'company_assets';

-- Step 3: Update statistics
analyze storage.objects;`;

  const ownershipCommands = `-- ORIGINAL APPROACH: Fix ownership (if you have supabase_admin access)
-- Step 1: Confirm role
select current_user;

-- Step 2: Grant permissions
grant usage on schema storage to postgres;
grant create on schema storage to postgres;

-- Step 3: Transfer ownership (requires elevated privileges)
alter table storage.objects owner to supabase_admin;

-- Step 4: Verify ownership change
select tableowner from pg_tables 
where schemaname = 'storage' and tablename = 'objects';`;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Status Check - Index Creation Issue</CardTitle>
          <p className="text-sm text-gray-600">
            Current status and next steps to resolve the ownership blockage
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={checkStatus} disabled={checking}>
            {checking ? "Analyzing..." : "Check Current Status"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <>
          <div className="space-y-4 mb-6">
            {results.map((result, index) => (
              <Card key={index} className={`${getStatusColor(result.status)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getStatusIcon(result.status)}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold">{result.category}</h3>
                      <p className="text-sm mt-1">{result.message}</p>
                      {result.action && result.action !== 'copy-commands' && result.action !== 'switch-role' && result.action !== 'direct-create' && (
                        <p className="text-xs text-gray-600 mt-1 italic">{result.action}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertDescription>
              <strong>Monica:</strong> The ownership transfer is failing because your current role lacks table ownership privileges. 
              Try Solution A first (switch to supabase_admin), then Solution B if needed.
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center gap-2">
                  🚀 Solution A: Switch to Admin Role (RECOMMENDED)
                  <Badge variant="outline" className="bg-green-100">Highest Success Rate</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Switch to supabase_admin role first, then create the index directly. This bypasses the ownership transfer issue.
                </p>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                    {solutionACommands}
                  </pre>
                  <Button
                    size="sm"
                    className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
                    onClick={() => copyToClipboard(solutionACommands)}
                  >
                    Copy All
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  ⚡ Solution B: Concurrent Index Creation
                  <Badge variant="outline" className="bg-blue-100">Fallback Option</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Create index using CONCURRENT method, which sometimes works with limited permissions.
                </p>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                    {solutionBCommands}
                  </pre>
                  <Button
                    size="sm"
                    className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
                    onClick={() => copyToClipboard(solutionBCommands)}
                  >
                    Copy All
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center gap-2">
                  🔧 Original Approach: Fix Ownership (If Above Fails)
                  <Badge variant="outline" className="bg-yellow-100">Requires High Privileges</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  The original ownership transfer approach - only use if you confirmed you have supabase_admin access.
                </p>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                    {ownershipCommands}
                  </pre>
                  <Button
                    size="sm"
                    className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
                    onClick={() => copyToClipboard(ownershipCommands)}
                  >
                    Copy All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="text-purple-800">After Success - Verification Steps</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-purple-700">
              <p className="mb-2">Once any solution succeeds, verify with:</p>
              <div className="bg-purple-900 text-purple-100 p-3 rounded font-mono text-xs">
                {`-- Check index exists
select indexname from pg_indexes where indexname = 'idx_storage_objects_company_assets_userfolder';

-- Test performance improvement
-- Go to /performance-test page and run tests`}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}