"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DebugUploadPage() {
  const [results, setResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const testResults: any[] = [];

    // Test 1: Check authentication status
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      testResults.push({
        test: "Authentication Status",
        result: authError ? `❌ Auth Error: ${authError.message}` : 
                user ? "✅ Logged In" : "⚠️ Not Logged In",
        details: authError ? authError : user ? {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        } : "No user session found. Go to /login to sign in."
      });
    } catch (err) {
      testResults.push({
        test: "Authentication Status",
        result: `❌ Exception: ${err}`,
        details: err
      });
    }

    // Test 2: Check Supabase client
    testResults.push({
      test: "Supabase Client",
      result: !!supabase ? "✅ Connected" : "❌ Not connected",
      details: supabase ? "Client object exists" : "Client is undefined"
    });

    // Test 3: List storage buckets
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      testResults.push({
        test: "List Buckets",
        result: bucketsError ? `❌ Error: ${bucketsError.message}` : "✅ Success",
        details: bucketsError ? bucketsError : buckets?.map(b => b.name).join(', ')
      });
    } catch (err) {
      testResults.push({
        test: "List Buckets",
        result: `❌ Exception: ${err}`,
        details: err
      });
    }

    // Test 4: Check company_assets bucket
    try {
      const { data: files, error: filesError } = await supabase.storage.from('company_assets').list();
      testResults.push({
        test: "Company Assets Bucket",
        result: filesError ? `❌ Error: ${filesError.message}` : "✅ Accessible",
        details: filesError ? filesError : `Found ${files?.length || 0} items`
      });
    } catch (err) {
      testResults.push({
        test: "Company Assets Bucket",
        result: `❌ Exception: ${err}`,
        details: err
      });
    }

    // Test 5: Test old API endpoint
    try {
      const response = await fetch('/api/company-assets');
      const data = await response.json();
      testResults.push({
        test: "Old API Endpoint",
        result: response.ok ? "✅ Success" : `❌ HTTP ${response.status}`,
        details: response.ok ? `Found ${data.data?.length || 0} assets` : data
      });
    } catch (err) {
      testResults.push({
        test: "Old API Endpoint",
        result: `❌ Exception: ${err}`,
        details: err
      });
    }

    // Test 6: Test new optimized API endpoint with server-side auth
    try {
      const response = await fetch('/api/storage/list');
      const data = await response.json();
      testResults.push({
        test: "Server-Side Auth API",
        result: response.ok ? "✅ Success" : `❌ HTTP ${response.status}`,
        details: response.ok ? `Server authenticated user, found ${data.files?.length || 0} files` : data
      });
    } catch (err) {
      testResults.push({
        test: "Server-Side Auth API",
        result: `❌ Exception: ${err}`,
        details: err
      });
    }

    // Test 7: Test server-side authenticated upload
    try {
      const testFile = new File(['test content from server auth'], 'server-auth-test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', testFile);
      
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      testResults.push({
        test: "Server Auth Upload",
        result: response.ok ? "✅ Success" : `❌ HTTP ${response.status}`,
        details: response.ok ? data : data
      });
    } catch (err) {
      testResults.push({
        test: "Server Auth Upload",
        result: `❌ Exception: ${err}`,
        details: err
      });
    }

    // Test 8: Test direct client upload (legacy)
    try {
      const testFile = new File(['test content'], 'debug-test.txt', { type: 'text/plain' });
      const { data: uploadResult, error: uploadError } = await supabase.storage
        .from('company_assets')
        .upload(`debug/${Date.now()}-test.txt`, testFile);

      testResults.push({
        test: "Direct Client Upload",
        result: uploadError ? `❌ Error: ${uploadError.message}` : "✅ Success",
        details: uploadError ? uploadError : uploadResult
      });
    } catch (err) {
      testResults.push({
        test: "Direct Client Upload",
        result: `❌ Exception: ${err}`,
        details: err
      });
    }

    // Test 9: Test shared folder upload API
    try {
      const testFile = new File(['shared test content'], 'shared-debug-test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', testFile);
      
      const response = await fetch('/api/storage/shared-upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      testResults.push({
        test: "Shared Folder Upload",
        result: response.ok ? "✅ Success" : `❌ HTTP ${response.status}`,
        details: response.ok ? `Uploaded to shared folder: ${data.path}` : data
      });
    } catch (err) {
      testResults.push({
        test: "Shared Folder Upload",
        result: `❌ Exception: ${err}`,
        details: err
      });
    }

    // Test 10: Test admin status API
    try {
      const response = await fetch('/api/admin/status');
      const data = await response.json();

      testResults.push({
        test: "Admin Status API",
        result: response.ok ? "✅ Success" : `❌ HTTP ${response.status}`,
        details: response.ok ? `Admin status: ${data.isAdmin ? 'Admin' : 'Regular User'}, Email: ${data.email || 'None'}` : data
      });
    } catch (err) {
      testResults.push({
        test: "Admin Status API",
        result: `❌ Exception: ${err}`,
        details: err
      });
    }

    // Test 11: Test admin management API
    try {
      const response = await fetch('/api/admin/list');
      const data = await response.json();

      testResults.push({
        test: "Admin Management API",
        result: response.ok ? "✅ Success" : `❌ HTTP ${response.status}`,
        details: response.ok ? `Found ${data.admins?.length || 0} admins` : data
      });
    } catch (err) {
      testResults.push({
        test: "Admin Management API",
        result: `❌ Exception: ${err}`,
        details: err
      });
    }

    // Test 12: Test avatar upload capability
    try {
      // Create a small test image file
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#4F46E5';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('TEST', 25, 55);
      }

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      const testFile = new File([blob], 'avatar-test.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('avatar', testFile);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      testResults.push({
        test: "Avatar Upload API",
        result: response.ok ? "✅ Success" : `❌ HTTP ${response.status}`,
        details: response.ok ? `Avatar uploaded: ${data.avatar_url ? 'URL generated' : 'No URL'}` : data
      });
    } catch (err) {
      testResults.push({
        test: "Avatar Upload API",
        result: `❌ Exception: ${err}`,
        details: err
      });
    }

    setResults(testResults);
    setTesting(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Upload System Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={runTests} disabled={testing}>
              {testing ? "Running Tests..." : "Run Debug Tests"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/login'}
            >
              🔐 Go to Login
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open('https://app.movearoundtms.com/api/debug-production', '_blank')}
            >
              🌐 Test Production
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard'}
            >
              📊 View Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/profile'}
            >
              👤 Profile Page
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded p-4">
                  <div className="font-semibold text-lg">{result.test}</div>
                  <div className="text-sm mt-1">{result.result}</div>
                  <div className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                    <pre>{JSON.stringify(result.details, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}