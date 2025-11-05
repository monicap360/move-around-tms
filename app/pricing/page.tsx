"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const tiers = [
  {
    name: 'Basic',
    price: '$0/mo',
    features: [
      'Ticket OCR & review',
      'Payroll & HR basics',
      'Profit reports',
    ],
    cta: 'Current Plan',
  },
  {
    name: 'Pro',
    price: '$199/mo',
    features: [
      'Everything in Basic',
      'Quote management & email',
      'Material rates master',
      'Branded quote PDFs',
      'Custom Digital Forms (Jot-style)',
      'IFTA & Compliance tools',
    ],
    cta: 'Upgrade to Pro',
  },
  {
    name: 'Enterprise',
    price: 'Contact us',
    features: [
      'Everything in Pro',
      'DocuSign/Adobe Sign integration',
      'Advanced analytics',
      'Custom workflows & SSO',
      'Priority support',
    ],
    cta: 'Contact Sales',
  },
];

export default function PricingPage() {
  const [plan, setPlan] = useState<'Basic' | 'Pro' | 'Enterprise'>('Basic');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/plan');
      const json = await res.json();
      if (json.plan) setPlan(json.plan);
    })();
  }, []);

  async function upgrade(newPlan: 'Basic' | 'Pro' | 'Enterprise') {
    setSaving(true);
    const res = await fetch('/api/admin/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''}`,
      },
      body: JSON.stringify({ plan: newPlan }),
    });
    const json = await res.json();
    if (json.plan) setPlan(json.plan);
    setSaving(false);
  }

  return (
    <div className="p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Pricing & Plans</h1>
        <p className="text-gray-600 mt-1">Choose the plan that fits your operation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t) => (
          <Card key={t.name} className={`relative ${plan === t.name ? 'ring-2 ring-blue-500' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-baseline justify-between">
                <span>{t.name}</span>
                <span className="text-xl font-bold">{t.price}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {t.features.map((f) => (
                  <li key={f} className="text-sm text-gray-700">• {f}</li>
                ))}
              </ul>
              {t.name === 'Enterprise' ? (
                <Button className="w-full" variant="outline" onClick={() => alert('We will reach out to you shortly.')}>
                  {t.cta}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  disabled={(plan === t.name) || saving}
                  onClick={() => upgrade(t.name as any)}
                >
                  {plan === t.name ? 'Current Plan' : t.cta}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
