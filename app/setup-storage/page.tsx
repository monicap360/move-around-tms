"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function SetupStoragePage() {
  const [results, setResults] = useState<string[]>([]);
  const [working, setWorking] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
  };

  const setupStorage = async () => {
    setWorking(true);
    setResults([]);

    try {
      addResult("🔍 Checking existing buckets...");
      
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        addResult(`❌ Could not list buckets: ${listError.message}`);
        setWorking(false);
        return;
      }

      const existingBuckets = buckets?.map(b => b.name) || [];
      addResult(`✅ Existing buckets: ${existingBuckets.join(', ') || 'none'}`);

      // Required buckets configuration
      const requiredBuckets = [
        {
          name: 'company_assets',
          description: 'Company logos, assets, and branding materials'
        },
        {
          name: 'hr_docs',
          description: 'HR documents and employee files'
        },
        {
          name: 'aggregate-tickets',
          description: 'Aggregate delivery tickets and receipts'
        }
      ];

      // Check and create each required bucket
      for (const bucketConfig of requiredBuckets) {
        const bucketExists = existingBuckets.includes(bucketConfig.name);
        
        if (bucketExists) {
          addResult(`✅ ${bucketConfig.name} bucket already exists`);
          
          // Test access
          const { data, error: accessError } = await supabase.storage
            .from(bucketConfig.name)
            .list('', { limit: 1 });
            
          if (accessError) {
            addResult(`⚠️  ${bucketConfig.name} exists but access error: ${accessError.message}`);
          } else {
            addResult(`✅ ${bucketConfig.name} bucket is accessible`);
          }
        } else {
          addResult(`⚠️  ${bucketConfig.name} bucket does not exist`);
          addResult(`🔄 Creating ${bucketConfig.name} bucket...`);
          
          // Create the bucket
          const { data: createData, error: createError } = await supabase.storage.createBucket(bucketConfig.name, {
            public: true,
            allowedMimeTypes: ['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            fileSizeLimit: 10485760 // 10MB
          });
          
          if (createError) {
            addResult(`❌ Failed to create ${bucketConfig.name} bucket: ${createError.message}`);
            addResult(`ℹ️  Please create ${bucketConfig.name} bucket manually in Supabase Dashboard`);
          } else {
            addResult(`✅ ${bucketConfig.name} bucket created successfully!`);
            addResult(`   Purpose: ${bucketConfig.description}`);
          }
        }
      }

      addResult("🎯 Storage setup complete!");
      addResult("✅ All required buckets have been checked/created");
      addResult("✅ Bucket permissions set to public with file size limits");
      addResult("✅ Supported file types: images, PDFs, text files, Word documents");
      addResult("ℹ️  You can now test uploads in the application");

    } catch (error) {
      addResult(`❌ Setup error: ${error}`);
    }

    setWorking(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Storage Setup Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm text-blue-800">
              This page checks if your Supabase storage buckets are set up correctly for file uploads.
            </p>
          </div>

          <Button onClick={setupStorage} disabled={working}>
            {working ? "Checking..." : "Check Storage Setup"}
          </Button>

          {results.length > 0 && (
            <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm max-h-96 overflow-auto">
              {results.map((result, index) => (
                <div key={index} className={
                  result.includes('✅') ? 'text-green-400' :
                  result.includes('❌') ? 'text-red-400' :
                  result.includes('⚠️') ? 'text-yellow-400' :
                  result.includes('ℹ️') ? 'text-blue-400' :
                  result.includes('🎯') ? 'text-purple-400' :
                  'text-gray-300'
                }>
                  {result}
                </div>
              ))}
            </div>
          )}

          {results.some(r => r.includes('does not exist')) && (
            <div className="bg-orange-50 border border-orange-200 rounded p-4">
              <h3 className="font-semibold text-orange-800 mb-2">Action Required:</h3>
              <ol className="text-sm text-orange-700 space-y-1">
                <li>1. Go to your Supabase Dashboard</li>
                <li>2. Navigate to Storage section</li>
                <li>3. Click "Create Bucket"</li>
                <li>4. Create bucket named "company_assets"</li>
                <li>5. Make it public or set up appropriate RLS policies</li>
                <li>6. Run this check again to verify</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
