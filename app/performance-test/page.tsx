"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

interface PerformanceResult {
  test: string;
  duration: number;
  result: string;
  details: any;
  timestamp: string;
}

export default function PerformanceTestPage() {
  const [results, setResults] = useState<PerformanceResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [baseline, setBaseline] = useState<PerformanceResult[]>([]);

  const measureTime = async (testName: string, testFunction: () => Promise<any>) => {
    const startTime = performance.now();
    try {
      const result = await testFunction();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        test: testName,
        duration: Math.round(duration),
        result: "✅ Success",
        details: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        test: testName,
        duration: Math.round(duration),
        result: `❌ Error: ${error}`,
        details: error,
        timestamp: new Date().toISOString()
      };
    }
  };

  const runPerformanceTests = async () => {
    setTesting(true);
    const testResults: PerformanceResult[] = [];

    // Test 1: List all files in company_assets bucket
    const listAllTest = await measureTime("List All Files", async () => {
      const { data, error } = await supabase.storage
        .from('company_assets')
        .list('', { limit: 1000 });
      if (error) throw error;
      return `Found ${data?.length || 0} files`;
    });
    testResults.push(listAllTest);

    // Test 2: List files by folder (this will benefit most from the index)
    const listByFolderTest = await measureTime("List Files by Folder", async () => {
      const { data, error } = await supabase.storage
        .from('company_assets')
        .list('user_uploads/', { limit: 1000 });
      if (error) throw error;
      return `Found ${data?.length || 0} files in user_uploads/`;
    });
    testResults.push(listByFolderTest);

    // Test 3: Multiple folder searches (simulates real usage)
    const multipleFoldersTest = await measureTime("Multiple Folder Searches", async () => {
      const folders = ['user_uploads/', 'documents/', 'images/', 'temp/', 'debug/'];
      const results = [];
      
      for (const folder of folders) {
        const { data, error } = await supabase.storage
          .from('company_assets')
          .list(folder, { limit: 100 });
        
        if (!error) {
          results.push({ folder, count: data?.length || 0 });
        }
      }
      
      return results;
    });
    testResults.push(multipleFoldersTest);

    // Test 4: Search for specific file patterns
    const patternSearchTest = await measureTime("Pattern Search", async () => {
      const { data, error } = await supabase.storage
        .from('company_assets')
        .list('', { 
          limit: 1000,
          search: '.pdf'
        });
      if (error) throw error;
      return `Found ${data?.length || 0} PDF files`;
    });
    testResults.push(patternSearchTest);

    // Test 5: Database query performance (direct SQL timing)
    const dbQueryTest = await measureTime("Direct DB Query", async () => {
      const { data, error } = await supabase
        .from('storage.objects')
        .select('name, bucket_id')
        .eq('bucket_id', 'company_assets')
        .limit(100);
      
      if (error) throw error;
      return `Queried ${data?.length || 0} objects`;
    });
    testResults.push(dbQueryTest);

    setResults(testResults);
    setTesting(false);
  };

  const saveAsBaseline = () => {
    setBaseline([...results]);
  };

  const compareWithBaseline = () => {
    if (baseline.length === 0) {
      console.log("No baseline saved yet. Run tests and save as baseline first.");
      return;
    }
    
    return results.map((current, index) => {
      const baselineTest = baseline[index];
      if (!baselineTest) return null;
      
      const improvement = ((baselineTest.duration - current.duration) / baselineTest.duration) * 100;
      return {
        test: current.test,
        before: baselineTest.duration,
        after: current.duration,
        improvement: Math.round(improvement),
        status: improvement > 0 ? '🚀 Faster' : improvement < -10 ? '🐌 Slower' : '📊 Similar'
      };
    }).filter(Boolean);
  };

  const comparison = compareWithBaseline();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Storage Performance Test</CardTitle>
          <p className="text-sm text-gray-600">
            Use this to measure before/after performance of database optimization
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={runPerformanceTests} disabled={testing}>
              {testing ? "Running Tests..." : "Run Performance Tests"}
            </Button>
            
            {results.length > 0 && (
              <Button onClick={saveAsBaseline} variant="outline">
                Save as Baseline
              </Button>
            )}
            
            {baseline.length > 0 && (
              <div className="text-sm text-green-600">
                ✅ Baseline saved ({baseline[0].timestamp.split('T')[0]})
              </div>
            )}
          </div>

          {comparison && comparison.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg text-green-800">Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparison.map((comp, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white rounded border">
                      <span className="font-medium">{comp.test}</span>
                      <div className="text-right">
                        <div className="text-sm">
                          {comp.before}ms → {comp.after}ms
                        </div>
                        <div className={`text-sm font-bold ${comp.improvement > 0 ? 'text-green-600' : comp.improvement < -10 ? 'text-red-600' : 'text-gray-600'}`}>
                          {comp.status} {comp.improvement > 0 ? `(${comp.improvement}% faster)` : comp.improvement < -10 ? `(${Math.abs(comp.improvement)}% slower)` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Test Results</CardTitle>
            <p className="text-sm text-gray-600">
              Times in milliseconds (lower is better)
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-lg">{result.test}</div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">
                        {result.duration}ms
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm mt-1 mb-2">{result.result}</div>
                  
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <pre>{JSON.stringify(result.details, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">How to Use This Tool</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700">
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Before optimization:</strong> Run tests and "Save as Baseline"</li>
            <li><strong>Apply Monica's database changes</strong> (the SQL commands you provided)</li>
            <li><strong>After optimization:</strong> Run tests again</li>
            <li><strong>Compare results:</strong> You'll see the performance improvement</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <strong>Expected improvements after index creation:</strong>
            <ul className="list-disc list-inside mt-2">
              <li>Folder-based operations: 70-90% faster</li>
              <li>Pattern searches: 50-80% faster</li>
              <li>Multiple folder queries: 80-95% faster</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}