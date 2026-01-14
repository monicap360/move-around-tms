"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Rule {
  id: string;
  rule_name: string;
  action: string;
  priority: number;
  active: boolean;
  rule_condition: any;
}

export default function TicketWorkflowRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    rule_name: "",
    action: "flag_for_review",
    priority: "100",
    rule_condition: '{"field":"quantity","operator":"gt","value":500}',
  });
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    try {
      const res = await fetch("/api/workflows/ticket-rules", { cache: "no-store" });
      const data = await res.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error("Failed to load rules", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const res = await fetch("/api/workflows/ticket-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule_name: formData.rule_name,
          action: formData.action,
          priority: Number(formData.priority),
          rule_condition: JSON.parse(formData.rule_condition || "{}"),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create rule");
      }
      setFormData({
        rule_name: "",
        action: "flag_for_review",
        priority: "100",
        rule_condition: '{"field":"quantity","operator":"gt","value":500}',
      });
      await loadRules();
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Workflow Automation Rules
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Automate ticket approvals and exception routing.
          </p>
        </div>

        {demoMode && (
          <div className="p-4 rounded border border-orange-400 bg-orange-50 text-orange-700 text-sm">
            Demo mode is enabled. Changes are not saved.
          </div>
        )}

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Create Rule
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <Input
              placeholder="Rule Name"
              value={formData.rule_name}
              onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
            />
            <select
              className="px-3 py-2 rounded border border-space-border bg-space-surface text-text-primary"
              value={formData.action}
              onChange={(e) => setFormData({ ...formData, action: e.target.value })}
            >
              {["auto_approve", "require_manager", "require_admin", "flag_for_review"].map(
                (action) => (
                  <option key={action} value={action}>
                    {action.replace("_", " ")}
                  </option>
                ),
              )}
            </select>
            <Input
              placeholder="Priority"
              value={formData.priority}
              type="number"
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            />
            <textarea
              className="w-full rounded border border-space-border bg-space-surface text-text-primary p-3 text-sm"
              rows={4}
              value={formData.rule_condition}
              onChange={(e) => setFormData({ ...formData, rule_condition: e.target.value })}
            />
            <Button onClick={handleCreate} disabled={demoMode || !formData.rule_name}>
              Save Rule
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Active Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : rules.length === 0 ? (
              <div className="text-text-secondary">No rules configured.</div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 rounded border border-space-border bg-space-surface"
                  >
                    <div className="text-text-primary font-medium">{rule.rule_name}</div>
                    <div className="text-text-secondary text-xs">
                      Action: {rule.action} • Priority: {rule.priority}
                    </div>
                    <pre className="text-xs text-text-secondary mt-2 whitespace-pre-wrap">
                      {JSON.stringify(rule.rule_condition, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
