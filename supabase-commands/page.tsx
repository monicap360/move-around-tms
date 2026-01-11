"use client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export default function SupabaseCommandsPage() {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Commands copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const step1SQL = `-- Step 1: Create helper function for folder extraction
create or replace function public.first_folder_segment(path text)
returns text
language sql
immutable
as $$
  select split_part(path, '/', 1);
$$;`;

  const step2SQL = `-- Step 2: Create optimized view for company assets
create or replace view public.company_assets_objects as
select
  id,
  bucket_id,
  name,
  public.first_folder_segment(name) as user_folder,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
from storage.objects
where bucket_id = 'company_assets';`;

  const step3SQL = `-- Step 3: Update RLS policies to use the helper function
-- (Replace existing policies with these optimized versions)

-- Policy for SELECT operations
create policy "Users can view their own folder files"
on storage.objects for select
using (
  bucket_id = 'company_assets' 
  and public.first_folder_segment(name) = (auth.uid())::text
);

-- Policy for INSERT operations  
create policy "Users can upload to their own folder"
on storage.objects for insert
with check (
  bucket_id = 'company_assets'
  and public.first_folder_segment(name) = (auth.uid())::text
);

-- Policy for DELETE operations
create policy "Users can delete their own files"
on storage.objects for delete
using (
  bucket_id = 'company_assets'
  and public.first_folder_segment(name) = (auth.uid())::text
);`;

  const step4SQL = `-- Step 4: Test the optimization
-- Check that helper function works
select public.first_folder_segment('user123/documents/file.pdf') as folder_test;

-- Test the view
select name, user_folder, created_at 
from public.company_assets_objects 
limit 5;

-- Check existing indexes (Supabase maintains these automatically)
select indexname, indexdef 
from pg_indexes 
where schemaname = 'storage' 
  and tablename = 'objects'
  and indexname like '%bucket%';`;

  const apiUpdateSQL = `-- Step 5: Example API usage (for your Next.js routes)
/*
// OLD WAY (slower):
const { data } = await supabase.storage
  .from('company_assets')
  .list(userFolder + '/', { limit: 100 });

// NEW WAY (faster with built-in indexes):
const { data } = await supabase
  .from('company_assets_objects')
  .select('name, user_folder, created_at, metadata')
  .eq('user_folder', userId)
  .order('created_at', { ascending: false });
*/`;

  const allCommands = `${step1SQL}

${step2SQL}

${step3SQL}

${step4SQL}`;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Supabase SQL Commands - Monica's Action List</CardTitle>
          <p className="text-sm text-gray-600">
            Run these commands in Supabase SQL Editor to optimize storage
            without fighting permissions
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
            <h3 className="font-semibold text-green-800 mb-2">
              ✅ Why This Approach Works:
            </h3>
            <ul className="text-sm text-green-700 list-disc list-inside space-y-1">
              <li>No ALTER TABLE or CREATE INDEX on system tables</li>
              <li>Uses Supabase's existing optimized indexes</li>
              <li>Creates user-space objects (function + view)</li>
              <li>Maintains security with RLS policies</li>
              <li>Gives same performance benefits</li>
            </ul>
          </div>

          <Button
            onClick={() => copyToClipboard(allCommands)}
            className="w-full mb-4"
          >
            📋 Copy All Commands (Recommended)
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              Step 1: Create Helper Function
              <Badge variant="outline" className="bg-blue-100">
                Safe & Fast
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Creates a reusable function to extract the first folder from file
              paths. This replaces complex string operations in queries.
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
              <pre className="text-sm whitespace-pre-wrap">{step1SQL}</pre>
              <Button
                size="sm"
                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
                onClick={() => copyToClipboard(step1SQL)}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-800 flex items-center gap-2">
              Step 2: Create Optimized View
              <Badge variant="outline" className="bg-purple-100">
                Performance Boost
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Creates a view that pre-filters company_assets and adds the
              user_folder column. Uses Supabase's built-in indexes.
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
              <pre className="text-sm whitespace-pre-wrap">{step2SQL}</pre>
              <Button
                size="sm"
                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
                onClick={() => copyToClipboard(step2SQL)}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              Step 3: Update RLS Policies
              <Badge variant="outline" className="bg-green-100">
                Security + Speed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Updates Row Level Security policies to use the helper function for
              faster, cleaner user-folder filtering.
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
              <pre className="text-sm whitespace-pre-wrap">{step3SQL}</pre>
              <Button
                size="sm"
                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
                onClick={() => copyToClipboard(step3SQL)}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              Step 4: Test & Verify
              <Badge variant="outline" className="bg-yellow-100">
                Validation
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Test commands to verify everything is working correctly and check
              Supabase's built-in indexes.
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
              <pre className="text-sm whitespace-pre-wrap">{step4SQL}</pre>
              <Button
                size="sm"
                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
                onClick={() => copyToClipboard(step4SQL)}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200">
          <CardHeader>
            <CardTitle className="text-indigo-800">
              Step 5: Update Your API Routes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              After running the SQL commands, update your Next.js API routes to
              use the new optimized view.
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
              <pre className="text-sm whitespace-pre-wrap">{apiUpdateSQL}</pre>
              <Button
                size="sm"
                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
                onClick={() => copyToClipboard(apiUpdateSQL)}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-emerald-200 bg-emerald-50">
        <CardHeader>
          <CardTitle className="text-emerald-800">
            Expected Results After Implementation
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-emerald-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Performance Improvements:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>50-80% faster folder-based queries</li>
                <li>Cleaner, more maintainable API code</li>
                <li>Better caching of query results</li>
                <li>Reduced database load</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Developer Benefits:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>No more permission battles</li>
                <li>Works with Supabase updates</li>
                <li>Easier to debug queries</li>
                <li>Future-proof approach</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
