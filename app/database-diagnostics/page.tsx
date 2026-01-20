"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";

interface DiagnosticResult {
  test: string;
  result: string;
  details: any;
  status: "success" | "error" | "warning";
}

export default function DatabaseDiagnosticsPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [testing, setTesting] = useState(false);

  const runDiagnostics = async () => {
    setTesting(true);
    const testResults: DiagnosticResult[] = [];

    // Test 1: Check current user/role
    try {
      const { data, error } = await supabase.rpc("get_current_user");
      if (error) {
        // Fallback: try a direct query
        const { data: userData, error: userError } = await supabase
          .from("information_schema.tables")
          .select("*")
          .limit(1);

        testResults.push({
          test: "Current Database Role",
          result: userError ? "❌ Cannot determine role" : "✅ Connected",
          details:
            userError || "Connection established (role detection limited)",
          status: userError ? "error" : "warning",
        });
      } else {
        testResults.push({
          test: "Current Database Role",
          result: `✅ Role: ${data}`,
          details: data,
          status: "success",
        });
      }
    } catch (err) {
      testResults.push({
        test: "Current Database Role",
        result: "❌ Error checking role",
        details: err,
        status: "error",
      });
    }

    // Test 2: Check storage schema permissions
    try {
      const { data, error } = await supabase
        .from("information_schema.schemata")
        .select("schema_name")
        .eq("schema_name", "storage");

      testResults.push({
        test: "Storage Schema Access",
        result: error
          ? "❌ No access to storage schema"
          : "✅ Can access storage schema",
        details:
          error || `Found storage schema: ${data?.length > 0 ? "Yes" : "No"}`,
        status: error ? "error" : "success",
      });
    } catch (err) {
      testResults.push({
        test: "Storage Schema Access",
        result: "❌ Schema access error",
        details: err,
        status: "error",
      });
    }

    // Test 3: Check table ownership and permissions
    try {
      const { data, error } = await supabase
        .from("information_schema.tables")
        .select("table_name, table_schema")
        .eq("table_schema", "storage")
        .eq("table_name", "objects");

      testResults.push({
        test: "Storage Objects Table",
        result: error
          ? "❌ Cannot access objects table info"
          : "✅ Table accessible",
        details: error || data,
        status: error ? "error" : "success",
      });
    } catch (err) {
      testResults.push({
        test: "Storage Objects Table",
        result: "❌ Table access error",
        details: err,
        status: "error",
      });
    }

    // Test 4: Check existing indexes on storage.objects
    try {
      const { data, error } = await supabase
        .from("pg_indexes")
        .select("indexname, indexdef")
        .eq("schemaname", "storage")
        .eq("tablename", "objects");

      testResults.push({
        test: "Existing Indexes",
        result: error
          ? "❌ Cannot check indexes"
          : `✅ Found ${data?.length || 0} indexes`,
        details:
          error ||
          data?.map((idx) => ({
            name: idx.indexname,
            definition: idx.indexdef,
          })),
        status: error ? "error" : "success",
      });
    } catch (err) {
      testResults.push({
        test: "Existing Indexes",
        result: "❌ Index check error",
        details: err,
        status: "error",
      });
    }

    // Test 5: Check if our target index already exists
    try {
      const { data, error } = await supabase
        .from("pg_indexes")
        .select("indexname, indexdef")
        .eq("indexname", "idx_storage_objects_company_assets_userfolder");

      testResults.push({
        test: "Target Index Status",
        result: error
          ? "❌ Cannot check target index"
          : data?.length > 0
            ? "✅ Index already exists!"
            : "⚠️ Index not created yet",
        details:
          error || (data?.length > 0 ? data[0] : "Index needs to be created"),
        status: error ? "error" : data?.length > 0 ? "success" : "warning",
      });
    } catch (err) {
      testResults.push({
        test: "Target Index Status",
        result: "❌ Target index check error",
        details: err,
        status: "error",
      });
    }

    // Test 6: Test storage bucket access
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      testResults.push({
        test: "Storage Bucket Access",
        result: error ? "❌ Cannot list buckets" : "✅ Storage API working",
        details: error || buckets?.map((b) => b.name),
        status: error ? "error" : "success",
      });
    } catch (err) {
      testResults.push({
        test: "Storage Bucket Access",
        result: "❌ Storage API error",
        details: err,
        status: "error",
      });
    }

    // Test 7: Company assets performance test
    try {
      const startTime = performance.now();
      const { data: files, error } = await supabase.storage
        .from("company_assets")
        .list("", { limit: 100 });
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      testResults.push({
        test: "Performance Baseline",
        result: error
          ? "❌ Cannot test performance"
          : `✅ Listed files in ${duration}ms`,
        details: error || {
          duration_ms: duration,
          file_count: files?.length || 0,
          performance_note:
            duration > 1000
              ? "Slow - index would help significantly"
              : duration > 500
                ? "Moderate - index would help"
                : "Fast",
        },
        status: error ? "error" : duration > 1000 ? "warning" : "success",
      });
    } catch (err) {
      testResults.push({
        test: "Performance Baseline",
        result: "❌ Performance test error",
        details: err,
        status: "error",
      });
    }

    setResults(testResults);
    setTesting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "border-green-200 bg-green-50";
      case "error":
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Database Diagnostics & Permissions Check</CardTitle>
          <p className="text-sm text-gray-600">
            Use this to diagnose database role and permission issues before
            creating the performance index
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runDiagnostics} disabled={testing}>
            {testing ? "Running Diagnostics..." : "Run Database Diagnostics"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Diagnostic Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {results.filter((r) => r.status === "success").length}
                  </div>
                  <div className="text-sm text-gray-600">Passing Tests</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-yellow-600">
                    {results.filter((r) => r.status === "warning").length}
                  </div>
                  <div className="text-sm text-gray-600">Warnings</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-red-600">
                    {results.filter((r) => r.status === "error").length}
                  </div>
                  <div className="text-sm text-gray-600">Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`border rounded p-4 ${getStatusColor(result.status)}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-lg flex items-center gap-2">
                        <span>{getStatusIcon(result.status)}</span>
                        {result.test}
                      </div>
                    </div>

                    <div className="text-sm mb-2">{result.result}</div>

                    <div className="text-xs bg-white bg-opacity-50 p-2 rounded">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">
            Next Steps Based on Results
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700">
          <div className="space-y-4">
            <div>
              <strong>✅ If all tests pass:</strong> Ready to create the index
              using Monica&apos;s SQL commands
            </div>

            <div>
              <strong>⚠️ If role/permission errors:</strong>
              <ul className="list-disc list-inside mt-2 ml-4">
                <li>Switch to &apos;supabase_admin&apos; role in Supabase SQL Editor</li>
                <li>Or use &apos;postgres&apos; role if available</li>
                <li>Try the ownership transfer commands again</li>
              </ul>
            </div>

            <div>
              <strong>❌ If storage access fails:</strong>
              <ul className="list-disc list-inside mt-2 ml-4">
                <li>Check Supabase project status</li>
                <li>Verify environment variables</li>
                <li>Check RLS policies on storage schema</li>
              </ul>
            </div>

            <div>
              <strong>🎯 If index already exists:</strong>
              <ul className="list-disc list-inside mt-2 ml-4">
                <li>Great! The optimization is already done</li>
                <li>
                  Use the performance test page to verify speed improvements
                </li>
                <li>
                  Run: <code>analyze storage.objects;</code> to update
                  statistics
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
