"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function FormsAdminPage() {
  const [plan, setPlan] = useState<'Basic' | 'Pro' | 'Enterprise'>('Basic');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/plan');
      const json = await res.json();
      if (json.plan) setPlan(json.plan);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  const isPro = plan === 'Pro' || plan === 'Enterprise';

  if (!isPro) {
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-3xl font-bold text-gray-800">Custom Digital Forms</h1>
        <p className="text-gray-600">Build Jot-style forms for quotes, agreements, and onboarding.</p>
        <Card>
          <CardContent className="p-6">
            <p className="mb-4">This feature is available on the <strong>Pro</strong> plan.</p>
            <Link href="/pricing">
              <Button>Upgrade to Pro</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Custom Digital Forms</h1>
          <p className="text-gray-600">Build and manage forms with signatures and workflow.</p>
        </div>
        <div className="space-x-2">
          <Button onClick={() => alert('Form builder coming soon')}>+ New Form</Button>
          <Link href="/pricing">
            <Button variant="outline">Change Plan ({plan})</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <p className="text-gray-700">Form builder UI is coming soon. In the meantime, you can generate branded quote PDFs and invoices from the Quotes and Invoices modules.</p>
        </CardContent>
      </Card>
    </div>
  );
}
