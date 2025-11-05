"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function TestUploadPage() {
  const [results, setResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);

    // Test 1: Check Supabase client
    addResult(`Supabase client exists: ${!!supabase}`);

    // Test 2: List buckets
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) {
        addResult(`❌ List buckets error: ${error.message}`);
      } else {
        addResult(`✅ Available buckets: ${buckets?.map(b => b.name).join(', ') || 'none'}`);
      }
    } catch (err) {
      addResult(`❌ List buckets exception: ${err}`);
    }

    // Test 3: Check company_assets bucket
    try {
      const { data, error } = await supabase.storage.from('company_assets').list('', { limit: 1 });
      if (error) {
        addResult(`❌ company_assets bucket error: ${error.message}`);
      } else {
        addResult(`✅ company_assets bucket accessible, contains ${data?.length || 0} items`);
      }
    } catch (err) {
      addResult(`❌ company_assets bucket exception: ${err}`);
    }

    // Test 4: Test API
    try {
      const response = await fetch('/api/company-assets');
      if (response.ok) {
        const data = await response.json();
        addResult(`✅ API endpoint working, returned ${data.data?.length || 0} assets`);
      } else {
        addResult(`❌ API endpoint error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      addResult(`❌ API endpoint exception: ${err}`);
    }

    // Test 5: Simple upload test
    try {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
      
      const { data, error } = await supabase.storage
        .from('company_assets')
        .upload(`test/${Date.now()}.txt`, testFile);

      if (error) {
        addResult(`❌ Test upload error: ${error.message}`);
      } else {
        addResult(`✅ Test upload successful: ${data.path}`);
      }
    } catch (err) {
      addResult(`❌ Test upload exception: ${err}`);
    }

    setTesting(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Upload System Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runTests} disabled={testing}>
            {testing ? "Running Tests..." : "Run Tests"}
          </Button>

          {results.length > 0 && (
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-auto">
              {results.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
