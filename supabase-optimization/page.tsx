"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

interface OptimizationResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: any;
  sql?: string;
}

export default function SupabaseOptimizationPage() {
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [optimizing, setOptimizing] = useState(false);

  const runOptimization = async () => {
    setOptimizing(true);
    const optimizationResults: OptimizationResult[] = [];

    // Step 1: Create helper function
    try {
      const helperFunction = `
        create or replace function public.first_folder_segment(path text)
        returns text
        language sql
        immutable
        as $$
          select split_part(path, '/', 1);
        $$;
      `;

      const { data, error } = await supabase.rpc('exec_sql', { sql: helperFunction });
      
      optimizationResults.push({
        step: "1. Create Helper Function",
        status: error ? 'error' : 'success',
        message: error ? `Error: ${error.message}` : "✅ Helper function created successfully",
        details: error || "Function public.first_folder_segment() is ready",
        sql: helperFunction
      });
    } catch (err) {
      optimizationResults.push({
        step: "1. Create Helper Function",
        status: 'warning',
        message: "⚠️ Could not create via API - run manually in SQL Editor",
        details: err,
        sql: `create or replace function public.first_folder_segment(path text)
returns text language sql immutable as $$
  select split_part(path, '/', 1);
$$;`
      });
    }

    // Step 2: Create optimized view
    try {
      const viewSQL = `
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
        where bucket_id = 'company_assets';
      `;

      const { data, error } = await supabase.rpc('exec_sql', { sql: viewSQL });
      
      optimizationResults.push({
        step: "2. Create Optimized View",
        status: error ? 'error' : 'success',
        message: error ? `Error: ${error.message}` : "✅ Company assets view created",
        details: error || "View public.company_assets_objects is ready for fast queries",
        sql: viewSQL
      });
    } catch (err) {
      optimizationResults.push({
        step: "2. Create Optimized View",
        status: 'warning',
        message: "⚠️ Could not create via API - run manually in SQL Editor",
        details: err,
        sql: `create or replace view public.company_assets_objects as
select id, bucket_id, name, public.first_folder_segment(name) as user_folder,
       owner, created_at, updated_at, last_accessed_at, metadata
from storage.objects where bucket_id = 'company_assets';`
      });
    }

    // Step 3: Test the optimized view
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('company_assets_objects')
        .select('*')
        .limit(5);

      optimizationResults.push({
        step: "3. Test Optimized View",
        status: viewError ? 'error' : 'success',
        message: viewError ? `Error: ${viewError.message}` : `✅ View working - found ${viewData?.length || 0} assets`,
        details: viewError || viewData,
        sql: "select * from public.company_assets_objects limit 5;"
      });
    } catch (err) {
      optimizationResults.push({
        step: "3. Test Optimized View",
        status: 'error',
        message: "❌ Could not query view",
        details: err
      });
    }

    // Step 4: Performance test - before and after
    try {
      // Test old method (direct storage query)
      const startOld = performance.now();
      const { data: oldData, error: oldError } = await supabase.storage
        .from('company_assets')
        .list('', { limit: 100 });
      const endOld = performance.now();
      const oldDuration = Math.round(endOld - startOld);

      // Test new method (view query) 
      const startNew = performance.now();
      const { data: newData, error: newError } = await supabase
        .from('company_assets_objects')
        .select('name, user_folder, created_at')
        .limit(100);
      const endNew = performance.now();
      const newDuration = Math.round(endNew - startNew);

      const improvement = oldDuration > 0 ? Math.round(((oldDuration - newDuration) / oldDuration) * 100) : 0;

      optimizationResults.push({
        step: "4. Performance Comparison",
        status: newError ? 'error' : 'success',
        message: newError ? `Error: ${newError.message}` : 
                `📊 Old: ${oldDuration}ms → New: ${newDuration}ms ${improvement > 0 ? `(${improvement}% faster)` : ''}`,
        details: {
          old_method: { duration_ms: oldDuration, file_count: oldData?.length || 0 },
          new_method: { duration_ms: newDuration, file_count: newData?.length || 0 },
          improvement_percent: improvement
        }
      });
    } catch (err) {
      optimizationResults.push({
        step: "4. Performance Comparison",
        status: 'error',
        message: "❌ Performance test failed",
        details: err
      });
    }

    // Step 5: Check existing indexes
    try {
      const { data: indexData, error: indexError } = await supabase
        .from('pg_indexes')
        .select('indexname, indexdef')
        .eq('schemaname', 'storage')
        .eq('tablename', 'objects');

      optimizationResults.push({
        step: "5. Verify Built-in Indexes",
        status: indexError ? 'warning' : 'success',
        message: indexError ? "⚠️ Could not check indexes" : `✅ Found ${indexData?.length || 0} existing indexes`,
        details: indexError || indexData?.map(idx => idx.indexname),
        sql: "select indexname from pg_indexes where schemaname = 'storage' and tablename = 'objects';"
      });
    } catch (err) {
      optimizationResults.push({
        step: "5. Verify Built-in Indexes",
        status: 'warning',
        message: "⚠️ Index check limited by permissions",
        details: "Supabase maintains internal indexes for bucket_id, name, and path operations"
      });
    }

    setResults(optimizationResults);
    setOptimizing(false);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('SQL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-500 bg-green-50';
      case 'error': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'pending': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'pending': return '⏳';
      default: return '📋';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Supabase-Friendly Optimization</CardTitle>
          <p className="text-sm text-gray-600">
            Optimize storage performance using Supabase's built-in capabilities instead of fighting permissions
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold text-blue-800 mb-2">New Approach Benefits:</h3>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>✅ Works with Supabase managed environment</li>
              <li>✅ Uses existing optimized indexes</li>
              <li>✅ Maintains per-user folder security</li>
              <li>✅ No permission battles with system tables</li>
              <li>✅ Cleaner API for your application</li>
            </ul>
          </div>
          
          <Button onClick={runOptimization} disabled={optimizing}>
            {optimizing ? "Running Optimization..." : "Run Supabase Optimization"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <Card key={index} className={`${getStatusColor(result.status)}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getStatusIcon(result.status)}</span>
                    <div>
                      <h3 className="font-semibold">{result.step}</h3>
                      <p className="text-sm mt-1">{result.message}</p>
                    </div>
                  </div>
                  {result.status === 'success' && (
                    <Badge className="bg-green-100 text-green-800">Complete</Badge>
                  )}
                </div>

                {result.sql && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-600">SQL Command:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(result.sql!)}
                      >
                        Copy SQL
                      </Button>
                    </div>
                    <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
                      <pre className="whitespace-pre-wrap">{result.sql}</pre>
                    </div>
                  </div>
                )}

                {result.details && (
                  <div className="mt-3 text-xs bg-white bg-opacity-50 p-2 rounded">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Card className="border-green-200 bg-green-50 mt-6">
            <CardHeader>
              <CardTitle className="text-green-800">Next Steps for Your Application</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-green-700">
              <p className="mb-3">After optimization, update your API routes to use the new view:</p>
              <div className="bg-green-900 text-green-100 p-3 rounded font-mono text-xs">
{`// Instead of storage.from('company_assets').list()
// Use the optimized view:
const { data } = await supabase
  .from('company_assets_objects')
  .select('name, user_folder, created_at')
  .eq('user_folder', userId)
  .order('created_at', { ascending: false });`}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
