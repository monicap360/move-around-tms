"use client";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [kyc, setKyc] = useState({ ein: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Simulate invite/registration/KYC flow
  const handleInvite = async () => {
    setLoading(true);
    setTimeout(() => {
      setStep(2);
      setLoading(false);
    }, 800);
  };
  const handleRegister = async () => {
    setLoading(true);
    setTimeout(() => {
      setStep(3);
      setLoading(false);
    }, 800);
  };
  const handleKyc = async () => {
    setLoading(true);
    setTimeout(() => {
      setStep(4);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded shadow p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Customer Onboarding</h1>
        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleInvite();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">
                Business Email
              </label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                placeholder="you@company.com"
              />
            </div>
            <Button type="submit" className="w-full">
              Send Invite Code
            </Button>
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </form>
        )}
        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRegister();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">
                Invite Code
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="Enter code from email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Company Name
              </label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                placeholder="Your Company LLC"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Your Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Full Name"
              />
            </div>
            <Button type="submit" className="w-full">
              Register Account
            </Button>
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </form>
        )}
        {step === 3 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleKyc();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">
                EIN / Tax ID
              </label>
              <Input
                value={kyc.ein}
                onChange={(e) => setKyc({ ...kyc, ein: e.target.value })}
                required
                placeholder="12-3456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Business Address
              </label>
              <Input
                value={kyc.address}
                onChange={(e) => setKyc({ ...kyc, address: e.target.value })}
                required
                placeholder="123 Main St, City, State"
              />
            </div>
            <Button type="submit" className="w-full">
              Complete KYC
            </Button>
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </form>
        )}
        {step === 4 && (
          <div className="space-y-4 text-center">
            <div className="text-green-600 text-3xl mb-2">✔</div>
            <div className="text-lg font-semibold">Onboarding Complete!</div>
            <div className="text-gray-600">
              Your account is ready. You can now log in and start booking loads.
            </div>
            <a href="/customer-portal">
              <Button
                className="w-full mt-4"
                onClick={() => {
                  localStorage.setItem("onboarded", "1");
                }}
              >
                Go to Portal
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
