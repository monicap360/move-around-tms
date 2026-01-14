"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useRouter } from "next/navigation";
import {
  Building2,
  Truck,
  Users,
  Settings,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Globe,
  FileText,
  Zap,
} from "lucide-react";
import { VERTICAL_PROFILES, type VerticalTypeString } from "@/lib/verticals";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface OrganizationData {
  name: string;
  dot_number: string;
  mc_number: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
  vertical_type: VerticalTypeString;
}

interface FleetData {
  truck_count: number;
  trailer_count: number;
  driver_count: number;
}

export default function QuickStartWizard() {
  const router = useRouter();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  
  const [orgData, setOrgData] = useState<OrganizationData>({
    name: "",
    dot_number: "",
    mc_number: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    phone: "",
    email: "",
    vertical_type: "construction_hauling",
  });

  const [fleetData, setFleetData] = useState<FleetData>({
    truck_count: 0,
    trailer_count: 0,
    driver_count: 0,
  });

  const [preferences, setPreferences] = useState({
    language: "en",
    timezone: "America/Chicago",
    currency: "USD",
    enableMexicanCompliance: false,
  });

  const steps: SetupStep[] = [
    {
      id: "organization",
      title: "Organization",
      description: "Set up your company profile",
      icon: <Building2 className="w-5 h-5" />,
      completed: currentStep > 0,
    },
    {
      id: "industry",
      title: "Industry",
      description: "Select your vertical",
      icon: <Settings className="w-5 h-5" />,
      completed: currentStep > 1,
    },
    {
      id: "fleet",
      title: "Fleet Size",
      description: "Tell us about your fleet",
      icon: <Truck className="w-5 h-5" />,
      completed: currentStep > 2,
    },
    {
      id: "preferences",
      title: "Preferences",
      description: "Configure your settings",
      icon: <Globe className="w-5 h-5" />,
      completed: currentStep > 3,
    },
    {
      id: "complete",
      title: "Complete",
      description: "You're all set!",
      icon: <CheckCircle className="w-5 h-5" />,
      completed: currentStep > 4,
    },
  ];

  useEffect(() => {
    if (demoMode) return;
    checkExistingSetup();
  }, [demoMode]);

  async function checkExistingSetup() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (orgMember?.organization_id) {
        setOrganizationId(orgMember.organization_id);
        
        const { data: org } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", orgMember.organization_id)
          .single();

        if (org) {
          setOrgData({
            name: org.name || "",
            dot_number: org.dot_number || "",
            mc_number: org.mc_number || "",
            address: org.address || "",
            city: org.city || "",
            state: org.state || "",
            zip: org.zip || "",
            country: org.country || "US",
            phone: org.phone || "",
            email: org.email || "",
            vertical_type: org.vertical_type || "construction_hauling",
          });
        }
      }
    } catch (err) {
      console.error("Error checking setup:", err);
    }
  }

  async function saveOrganization() {
    if (demoMode) {
      setCurrentStep(currentStep + 1);
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (organizationId) {
        await supabase
          .from("organizations")
          .update({
            name: orgData.name,
            dot_number: orgData.dot_number,
            mc_number: orgData.mc_number,
            address: orgData.address,
            city: orgData.city,
            state: orgData.state,
            zip: orgData.zip,
            country: orgData.country,
            phone: orgData.phone,
            email: orgData.email,
            vertical_type: orgData.vertical_type,
          })
          .eq("id", organizationId);
      } else {
        const { data: newOrg, error } = await supabase
          .from("organizations")
          .insert({
            name: orgData.name,
            dot_number: orgData.dot_number,
            mc_number: orgData.mc_number,
            address: orgData.address,
            city: orgData.city,
            state: orgData.state,
            zip: orgData.zip,
            country: orgData.country,
            phone: orgData.phone,
            email: orgData.email,
            vertical_type: orgData.vertical_type,
          })
          .select()
          .single();

        if (error) throw error;
        if (newOrg) {
          setOrganizationId(newOrg.id);
          
          await supabase
            .from("organization_members")
            .insert({
              organization_id: newOrg.id,
              user_id: user.id,
              role: "admin",
            });
        }
      }
      
      setCurrentStep(currentStep + 1);
    } catch (err) {
      console.error("Error saving organization:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveVertical() {
    if (demoMode) {
      setCurrentStep(currentStep + 1);
      return;
    }
    setLoading(true);
    try {
      if (organizationId) {
        await supabase
          .from("organizations")
          .update({ vertical_type: orgData.vertical_type })
          .eq("id", organizationId);
      }
      setCurrentStep(currentStep + 1);
    } catch (err) {
      console.error("Error saving vertical:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveFleetSize() {
    if (demoMode) {
      setCurrentStep(currentStep + 1);
      return;
    }
    setLoading(true);
    try {
      if (organizationId) {
        await supabase
          .from("organizations")
          .update({
            truck_count: fleetData.truck_count,
            trailer_count: fleetData.trailer_count,
            driver_count: fleetData.driver_count,
          })
          .eq("id", organizationId);
      }
      setCurrentStep(currentStep + 1);
    } catch (err) {
      console.error("Error saving fleet size:", err);
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    if (demoMode) {
      setCurrentStep(currentStep + 1);
      return;
    }
    setLoading(true);
    try {
      if (organizationId) {
        await supabase
          .from("organizations")
          .update({
            default_language: preferences.language,
            timezone: preferences.timezone,
            currency: preferences.currency,
            enable_mexican_compliance: preferences.enableMexicanCompliance,
          })
          .eq("id", organizationId);
      }
      setCurrentStep(currentStep + 1);
    } catch (err) {
      console.error("Error saving preferences:", err);
    } finally {
      setLoading(false);
    }
  }

  function goToDashboard() {
    router.push("/");
  }

  const selectedVertical = VERTICAL_PROFILES[orgData.vertical_type as keyof typeof VERTICAL_PROFILES];

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Quick Start Setup
          </h1>
          <p className="text-text-secondary mt-2">
            Get your TMS up and running in minutes
          </p>
        </div>
        {demoMode && (
          <div className="mb-6 p-4 rounded border border-orange-400 bg-orange-50 text-orange-700 text-sm">
            Setup is running in demo mode. Changes are not saved.
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                idx <= currentStep ? "opacity-100" : "opacity-40"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  idx < currentStep
                    ? "bg-gold-primary border-gold-primary text-space-deep"
                    : idx === currentStep
                    ? "border-gold-primary text-gold-primary"
                    : "border-space-border text-text-secondary"
                }`}
              >
                {idx < currentStep ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  step.icon
                )}
              </div>
              <p className="text-xs text-text-secondary mt-2 hidden md:block">
                {step.title}
              </p>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              {steps[currentStep]?.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Step 0: Organization */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <p className="text-text-secondary text-sm mb-6">
                  Enter your company information to get started.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      Company Name *
                    </label>
                    <Input
                      value={orgData.name}
                      onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                      placeholder="Your Company LLC"
                      className="bg-space-surface border-space-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      DOT Number
                    </label>
                    <Input
                      value={orgData.dot_number}
                      onChange={(e) => setOrgData({ ...orgData, dot_number: e.target.value })}
                      placeholder="1234567"
                      className="bg-space-surface border-space-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      MC Number
                    </label>
                    <Input
                      value={orgData.mc_number}
                      onChange={(e) => setOrgData({ ...orgData, mc_number: e.target.value })}
                      placeholder="MC-123456"
                      className="bg-space-surface border-space-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      Phone
                    </label>
                    <Input
                      value={orgData.phone}
                      onChange={(e) => setOrgData({ ...orgData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="bg-space-surface border-space-border text-text-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      Email
                    </label>
                    <Input
                      value={orgData.email}
                      onChange={(e) => setOrgData({ ...orgData, email: e.target.value })}
                      placeholder="dispatch@company.com"
                      className="bg-space-surface border-space-border text-text-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      Address
                    </label>
                    <Input
                      value={orgData.address}
                      onChange={(e) => setOrgData({ ...orgData, address: e.target.value })}
                      placeholder="123 Main Street"
                      className="bg-space-surface border-space-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      City
                    </label>
                    <Input
                      value={orgData.city}
                      onChange={(e) => setOrgData({ ...orgData, city: e.target.value })}
                      placeholder="Houston"
                      className="bg-space-surface border-space-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      State
                    </label>
                    <Input
                      value={orgData.state}
                      onChange={(e) => setOrgData({ ...orgData, state: e.target.value })}
                      placeholder="TX"
                      className="bg-space-surface border-space-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      ZIP Code
                    </label>
                    <Input
                      value={orgData.zip}
                      onChange={(e) => setOrgData({ ...orgData, zip: e.target.value })}
                      placeholder="77001"
                      className="bg-space-surface border-space-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      Country
                    </label>
                    <select
                      value={orgData.country}
                      onChange={(e) => setOrgData({ ...orgData, country: e.target.value })}
                      className="w-full p-2 bg-space-surface border border-space-border rounded text-text-primary"
                    >
                      <option value="US">United States</option>
                      <option value="MX">Mexico</option>
                      <option value="CA">Canada</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={saveOrganization}
                    disabled={loading || !orgData.name}
                    className="bg-gold-primary text-space-deep hover:bg-gold-secondary"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 1: Industry Vertical */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-text-secondary text-sm mb-6">
                  Select your industry to optimize confidence scoring and anomaly detection.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(VERTICAL_PROFILES).map((profile) => (
                    <div
                      key={profile.type}
                      onClick={() => setOrgData({ ...orgData, vertical_type: profile.type })}
                      className={`p-4 rounded border cursor-pointer transition-all ${
                        orgData.vertical_type === profile.type
                          ? "border-gold-primary bg-space-surface"
                          : "border-space-border hover:border-gold-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-text-primary font-medium">{profile.name}</h3>
                        {orgData.vertical_type === profile.type && (
                          <CheckCircle className="w-5 h-5 text-gold-primary" />
                        )}
                      </div>
                      <p className="text-text-secondary text-xs">{profile.description}</p>
                    </div>
                  ))}
                </div>

                {selectedVertical && (
                  <div className="mt-6 p-4 bg-space-surface rounded border border-space-border">
                    <h4 className="text-text-primary text-sm font-medium mb-2">
                      Optimized Settings for {selectedVertical.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-text-secondary">Driver Baseline:</span>
                        <span className="text-gold-primary ml-2">{selectedVertical.baselineWindows.driver} days</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Site Baseline:</span>
                        <span className="text-gold-primary ml-2">{selectedVertical.baselineWindows.site} days</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="border-space-border text-text-secondary"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={saveVertical}
                    disabled={loading}
                    className="bg-gold-primary text-space-deep hover:bg-gold-secondary"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Fleet Size */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-text-secondary text-sm mb-6">
                  Tell us about your fleet size to help us configure your system.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-space-surface rounded border border-space-border">
                    <Truck className="w-8 h-8 text-gold-primary mx-auto mb-3" />
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      Trucks
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={fleetData.truck_count || ""}
                      onChange={(e) => setFleetData({ ...fleetData, truck_count: parseInt(e.target.value) || 0 })}
                      className="bg-space-deep border-space-border text-text-primary text-center text-2xl"
                    />
                  </div>
                  <div className="text-center p-6 bg-space-surface rounded border border-space-border">
                    <FileText className="w-8 h-8 text-gold-primary mx-auto mb-3" />
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      Trailers
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={fleetData.trailer_count || ""}
                      onChange={(e) => setFleetData({ ...fleetData, trailer_count: parseInt(e.target.value) || 0 })}
                      className="bg-space-deep border-space-border text-text-primary text-center text-2xl"
                    />
                  </div>
                  <div className="text-center p-6 bg-space-surface rounded border border-space-border">
                    <Users className="w-8 h-8 text-gold-primary mx-auto mb-3" />
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      Drivers
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={fleetData.driver_count || ""}
                      onChange={(e) => setFleetData({ ...fleetData, driver_count: parseInt(e.target.value) || 0 })}
                      className="bg-space-deep border-space-border text-text-primary text-center text-2xl"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="border-space-border text-text-secondary"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={saveFleetSize}
                    disabled={loading}
                    className="bg-gold-primary text-space-deep hover:bg-gold-secondary"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Preferences */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-text-secondary text-sm mb-6">
                  Configure your regional and compliance preferences.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      Language
                    </label>
                    <select
                      value={preferences.language}
                      onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                      className="w-full p-2 bg-space-surface border border-space-border rounded text-text-primary"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      Timezone
                    </label>
                    <select
                      value={preferences.timezone}
                      onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                      className="w-full p-2 bg-space-surface border border-space-border rounded text-text-primary"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="America/Mexico_City">Mexico City</option>
                      <option value="America/Monterrey">Monterrey</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
                      Currency
                    </label>
                    <select
                      value={preferences.currency}
                      onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                      className="w-full p-2 bg-space-surface border border-space-border rounded text-text-primary"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="MXN">MXN - Mexican Peso</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.enableMexicanCompliance}
                        onChange={(e) => setPreferences({ ...preferences, enableMexicanCompliance: e.target.checked })}
                        className="mr-3 w-4 h-4"
                      />
                      <span className="text-text-primary text-sm">
                        Enable Mexican Tax Compliance (CFDI/Carta Porte)
                      </span>
                    </label>
                  </div>
                </div>

                {preferences.enableMexicanCompliance && (
                  <div className="p-4 bg-space-surface rounded border border-gold-primary/30">
                    <div className="flex items-center gap-2 text-gold-primary mb-2">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm font-medium">Mexican Compliance Enabled</span>
                    </div>
                    <p className="text-text-secondary text-xs">
                      CFDI 4.0 electronic invoicing and Carta Porte 3.0 transportation complement 
                      will be available for your invoices and shipments.
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="border-space-border text-text-secondary"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={savePreferences}
                    disabled={loading}
                    className="bg-gold-primary text-space-deep hover:bg-gold-secondary"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Complete Setup
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {currentStep === 4 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gold-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-space-deep" />
                </div>
                <h2 className="text-xl font-medium text-text-primary mb-2">
                  Setup Complete!
                </h2>
                <p className="text-text-secondary mb-8 max-w-md mx-auto">
                  Your TMS is configured and ready to use. You can start adding drivers, 
                  trucks, and processing tickets right away.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-space-surface rounded border border-space-border">
                    <h3 className="text-text-primary font-medium mb-1">Next: Add Drivers</h3>
                    <p className="text-text-secondary text-xs">
                      Add your drivers to start tracking their loads
                    </p>
                  </div>
                  <div className="p-4 bg-space-surface rounded border border-space-border">
                    <h3 className="text-text-primary font-medium mb-1">Import Data</h3>
                    <p className="text-text-secondary text-xs">
                      Import existing data from spreadsheets
                    </p>
                  </div>
                  <div className="p-4 bg-space-surface rounded border border-space-border">
                    <h3 className="text-text-primary font-medium mb-1">FastScan</h3>
                    <p className="text-text-secondary text-xs">
                      Start scanning tickets with OCR
                    </p>
                  </div>
                </div>

                <Button
                  onClick={goToDashboard}
                  className="bg-gold-primary text-space-deep hover:bg-gold-secondary"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
