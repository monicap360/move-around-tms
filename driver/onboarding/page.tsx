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
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  CreditCard,
  Shield,
  User,
  DollarSign,
  Building,
  Phone,
  Mail,
  Camera,
  Download,
  Truck,
} from "lucide-react";

interface DocumentRequirement {
  key: string;
  title: string;
  description: string;
  required: boolean;
  icon: any;
  acceptedFormats: string;
  status: "not_uploaded" | "uploaded" | "approved" | "rejected";
  file?: File | null;
  uploadUrl?: string;
  expirationDate?: string;
}

interface OnboardingData {
  personalInfo: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
  };
  employmentInfo: {
    startDate: string;
    position: string;
    payRate: string;
    payType: "hourly" | "per_mile" | "per_load" | "salary";
    taxStatus: "W2" | "1099";
    employmentType: "full_time" | "part_time" | "contractor";
  };
  documents: DocumentRequirement[];
}

export default function DriverOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    personalInfo: {
      fullName: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
    },
    employmentInfo: {
      startDate: new Date().toISOString().split("T")[0],
      position: "Commercial Driver",
      payRate: "",
      payType: "per_mile",
      taxStatus: "W2",
      employmentType: "full_time",
    },
    documents: [
      {
        key: "drivers_license",
        title: "Driver's License",
        description: "Front and back of valid driver's license",
        required: true,
        icon: CreditCard,
        acceptedFormats: "image/*,.pdf",
        status: "not_uploaded",
      },
      {
        key: "cdl_license",
        title: "CDL License",
        description: "Commercial Driver's License (CDL)",
        required: true,
        icon: Truck,
        acceptedFormats: "image/*,.pdf",
        status: "not_uploaded",
      },
      {
        key: "twic_card",
        title: "TWIC Card",
        description: "Transportation Worker Identification Credential",
        required: true,
        icon: Shield,
        acceptedFormats: "image/*,.pdf",
        status: "not_uploaded",
      },
      {
        key: "social_security_card",
        title: "Social Security Card",
        description: "Social Security Administration issued card",
        required: true,
        icon: User,
        acceptedFormats: "image/*,.pdf",
        status: "not_uploaded",
      },
      {
        key: "medical_certificate",
        title: "DOT Medical Certificate",
        description: "DOT Medical Examiner Certificate",
        required: true,
        icon: FileText,
        acceptedFormats: "image/*,.pdf",
        status: "not_uploaded",
      },
      {
        key: "w2_form",
        title: "W-2 Form",
        description: "Previous year's W-2 tax form (if applicable)",
        required: false,
        icon: DollarSign,
        acceptedFormats: "image/*,.pdf",
        status: "not_uploaded",
      },
      {
        key: "form_1099",
        title: "1099 Form",
        description: "Previous year's 1099 tax form (if applicable)",
        required: false,
        icon: DollarSign,
        acceptedFormats: "image/*,.pdf",
        status: "not_uploaded",
      },
      {
        key: "birth_certificate",
        title: "Birth Certificate",
        description: "Certified copy of birth certificate",
        required: false,
        icon: FileText,
        acceptedFormats: "image/*,.pdf",
        status: "not_uploaded",
      },
      {
        key: "passport",
        title: "Passport",
        description: "Valid U.S. Passport (alternative to birth certificate)",
        required: false,
        icon: FileText,
        acceptedFormats: "image/*,.pdf",
        status: "not_uploaded",
      },
    ],
  });

  const [userEmail, setUserEmail] = useState("");
  const [driverProfile, setDriverProfile] = useState<any>(null);

  useEffect(() => {
    checkAuthAndProfile();
  }, []);

  const checkAuthAndProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserEmail(user.email || "");

      // Check if driver already has an onboarding record
      const { data: existingOnboarding } = await supabase
        .from("driver_onboarding")
        .select("*")
        .eq("driver_email", user.email)
        .single();

      if (existingOnboarding) {
        // Load existing onboarding data
        setCurrentStep(existingOnboarding.current_step || 1);
        // TODO: Load existing form data if needed
      }
    } catch (err) {
      console.error("Error checking profile:", err);
    }
  };

  const handlePersonalInfoChange = (field: string, value: string) => {
    setOnboardingData((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value,
      },
    }));
  };

  const handleEmploymentInfoChange = (field: string, value: string) => {
    setOnboardingData((prev) => ({
      ...prev,
      employmentInfo: {
        ...prev.employmentInfo,
        [field]: value,
      },
    }));
  };

  const handleFileUpload = async (documentKey: string, file: File) => {
    try {
      setLoading(true);

      // Upload file to Supabase Storage
      const path = `onboarding-docs/${userEmail}/${documentKey}/${Date.now()}-${file.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("hr_docs")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("hr_docs").getPublicUrl(uploadData.path);

      // Update document status
      setOnboardingData((prev) => ({
        ...prev,
        documents: prev.documents.map((doc) =>
          doc.key === documentKey
            ? { ...doc, status: "uploaded", uploadUrl: publicUrl, file: file }
            : doc,
        ),
      }));

      // Save to database
      await supabase.from("driver_onboarding_documents").upsert({
        driver_email: userEmail,
        document_type: documentKey,
        file_url: publicUrl,
        file_name: file.name,
        status: "uploaded",
        uploaded_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("Upload failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentStep = async () => {
    try {
      setLoading(true);

      await supabase.from("driver_onboarding").upsert({
        driver_email: userEmail,
        current_step: currentStep,
        personal_info: JSON.stringify(onboardingData.personalInfo),
        employment_info: JSON.stringify(onboardingData.employmentInfo),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving step:", error);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      setLoading(true);

      const requiredDocs = onboardingData.documents.filter(
        (doc) => doc.required,
      );
      const uploadedRequiredDocs = requiredDocs.filter(
        (doc) => doc.status === "uploaded",
      );

      if (uploadedRequiredDocs.length < requiredDocs.length) {
        alert(
          "Please upload all required documents before completing onboarding.",
        );
        return;
      }

      // Create driver profile
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          email: userEmail,
          name: onboardingData.personalInfo.fullName,
          phone: onboardingData.personalInfo.phone,
          address: `${onboardingData.personalInfo.address}, ${onboardingData.personalInfo.city}, ${onboardingData.personalInfo.state} ${onboardingData.personalInfo.zipCode}`,
          emergency_contact_name:
            onboardingData.personalInfo.emergencyContactName,
          emergency_contact_phone:
            onboardingData.personalInfo.emergencyContactPhone,
          emergency_contact_relation:
            onboardingData.personalInfo.emergencyContactRelation,
          pay_type: onboardingData.employmentInfo.payType,
          tax_status: onboardingData.employmentInfo.taxStatus,
          employment_type: onboardingData.employmentInfo.employmentType,
          hire_date: onboardingData.employmentInfo.startDate,
          onboarding_status: "completed",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (driverError) {
        throw new Error(driverError.message);
      }

      // Update onboarding status
      await supabase
        .from("driver_onboarding")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          driver_id: driverData.id,
        })
        .eq("driver_email", userEmail);

      alert("Onboarding completed successfully! Welcome to the team!");
      window.location.href = "/driver/profile";
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      alert("Error completing onboarding: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    const totalSteps = 4; // Personal Info, Employment Info, Documents, Review
    return Math.round((currentStep / totalSteps) * 100);
  };

  const getDocumentCompletionPercentage = () => {
    const totalRequired = onboardingData.documents.filter(
      (doc) => doc.required,
    ).length;
    const uploadedRequired = onboardingData.documents.filter(
      (doc) => doc.required && doc.status === "uploaded",
    ).length;
    return totalRequired > 0
      ? Math.round((uploadedRequired / totalRequired) * 100)
      : 0;
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <Progress value={getProgressPercentage()} className="mb-4" />
      <div className="flex justify-between text-sm text-gray-600">
        <span className={currentStep >= 1 ? "text-blue-600 font-medium" : ""}>
          Personal Info
        </span>
        <span className={currentStep >= 2 ? "text-blue-600 font-medium" : ""}>
          Employment
        </span>
        <span className={currentStep >= 3 ? "text-blue-600 font-medium" : ""}>
          Documents
        </span>
        <span className={currentStep >= 4 ? "text-blue-600 font-medium" : ""}>
          Review
        </span>
      </div>
    </div>
  );

  const renderPersonalInfoStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <Input
              type="text"
              value={onboardingData.personalInfo.fullName}
              onChange={(e) =>
                handlePersonalInfoChange("fullName", e.target.value)
              }
              placeholder="John Smith"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <Input
              type="tel"
              value={onboardingData.personalInfo.phone}
              onChange={(e) =>
                handlePersonalInfoChange("phone", e.target.value)
              }
              placeholder="(555) 123-4567"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <Input
            type="email"
            value={userEmail}
            disabled
            className="bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Street Address *
          </label>
          <Input
            type="text"
            value={onboardingData.personalInfo.address}
            onChange={(e) =>
              handlePersonalInfoChange("address", e.target.value)
            }
            placeholder="123 Main Street"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <Input
              type="text"
              value={onboardingData.personalInfo.city}
              onChange={(e) => handlePersonalInfoChange("city", e.target.value)}
              placeholder="Houston"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State *
            </label>
            <Input
              type="text"
              value={onboardingData.personalInfo.state}
              onChange={(e) =>
                handlePersonalInfoChange("state", e.target.value)
              }
              placeholder="TX"
              maxLength={2}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code *
            </label>
            <Input
              type="text"
              value={onboardingData.personalInfo.zipCode}
              onChange={(e) =>
                handlePersonalInfoChange("zipCode", e.target.value)
              }
              placeholder="77001"
              maxLength={10}
              required
            />
          </div>
        </div>

        <div className="border-t pt-4 mt-6">
          <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name *
              </label>
              <Input
                type="text"
                value={onboardingData.personalInfo.emergencyContactName}
                onChange={(e) =>
                  handlePersonalInfoChange(
                    "emergencyContactName",
                    e.target.value,
                  )
                }
                placeholder="Jane Smith"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone *
              </label>
              <Input
                type="tel"
                value={onboardingData.personalInfo.emergencyContactPhone}
                onChange={(e) =>
                  handlePersonalInfoChange(
                    "emergencyContactPhone",
                    e.target.value,
                  )
                }
                placeholder="(555) 987-6543"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relationship *
            </label>
            <Input
              type="text"
              value={onboardingData.personalInfo.emergencyContactRelation}
              onChange={(e) =>
                handlePersonalInfoChange(
                  "emergencyContactRelation",
                  e.target.value,
                )
              }
              placeholder="Spouse, Parent, Sibling, etc."
              required
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmploymentInfoStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          Employment Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <Input
              type="date"
              value={onboardingData.employmentInfo.startDate}
              onChange={(e) =>
                handleEmploymentInfoChange("startDate", e.target.value)
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position *
            </label>
            <select
              value={onboardingData.employmentInfo.position}
              onChange={(e) =>
                handleEmploymentInfoChange("position", e.target.value)
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Commercial Driver">Commercial Driver</option>
              <option value="Owner Operator">Owner Operator</option>
              <option value="Local Driver">Local Driver</option>
              <option value="Long Haul Driver">Long Haul Driver</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pay Type *
            </label>
            <select
              value={onboardingData.employmentInfo.payType}
              onChange={(e) =>
                handleEmploymentInfoChange("payType", e.target.value)
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="per_mile">Per Mile</option>
              <option value="per_load">Per Load</option>
              <option value="hourly">Hourly</option>
              <option value="salary">Salary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pay Rate *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={onboardingData.employmentInfo.payRate}
              onChange={(e) =>
                handleEmploymentInfoChange("payRate", e.target.value)
              }
              placeholder="0.55"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {onboardingData.employmentInfo.payType === "per_mile" &&
                "Rate per mile"}
              {onboardingData.employmentInfo.payType === "per_load" &&
                "Rate per load"}
              {onboardingData.employmentInfo.payType === "hourly" &&
                "Hourly rate"}
              {onboardingData.employmentInfo.payType === "salary" &&
                "Annual salary"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Status *
            </label>
            <select
              value={onboardingData.employmentInfo.taxStatus}
              onChange={(e) =>
                handleEmploymentInfoChange("taxStatus", e.target.value)
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="W2">W-2 Employee</option>
              <option value="1099">1099 Contractor</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              W-2 = Employee with tax withholding | 1099 = Independent
              contractor
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employment Type *
            </label>
            <select
              value={onboardingData.employmentInfo.employmentType}
              onChange={(e) =>
                handleEmploymentInfoChange("employmentType", e.target.value)
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contractor">Independent Contractor</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Upload
              </CardTitle>
              <div className="mt-2">
                <Progress
                  value={getDocumentCompletionPercentage()}
                  className="mb-2"
                />
                <p className="text-sm text-gray-600">
                  Required documents:{" "}
                  {
                    onboardingData.documents.filter(
                      (doc) => doc.required && doc.status === "uploaded",
                    ).length
                  }{" "}
                  of{" "}
                  {
                    onboardingData.documents.filter((doc) => doc.required)
                      .length
                  }{" "}
                  completed
                </p>
              </div>
            </div>
            <a
              href="/driver/templates"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Forms
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {onboardingData.documents.map((doc) => {
              const IconComponent = doc.icon;
              return (
                <div
                  key={doc.key}
                  className={`border rounded-lg p-4 ${doc.required ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <IconComponent
                        className={`w-5 h-5 ${doc.required ? "text-blue-600" : "text-gray-500"}`}
                      />
                      <div>
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          {doc.title}
                          {doc.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {doc.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {doc.status === "uploaded" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {doc.status === "uploaded" && doc.uploadUrl ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-700">
                            Document uploaded successfully
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.uploadUrl, "_blank")}
                          className="text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept={doc.acceptedFormats}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(doc.key, file);
                            }
                          }}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Accepted formats: Images, PDF • Max size: 10MB
                        </p>
                      </div>
                    )}

                    {doc.key === "medical_certificate" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiration Date
                        </label>
                        <Input
                          type="date"
                          value={doc.expirationDate || ""}
                          onChange={(e) => {
                            setOnboardingData((prev) => ({
                              ...prev,
                              documents: prev.documents.map((d) =>
                                d.key === doc.key
                                  ? { ...d, expirationDate: e.target.value }
                                  : d,
                              ),
                            }));
                          }}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">
                  Document Upload Guidelines
                </h4>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                  <li>• Ensure all documents are clear and legible</li>
                  <li>• Upload both front and back sides where applicable</li>
                  <li>• Documents must be current and not expired</li>
                  <li>• All required documents must be uploaded to proceed</li>
                  <li>• Documents will be reviewed by HR within 24-48 hours</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderReviewStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Review & Submit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Personal Information
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Name:</span>{" "}
                {onboardingData.personalInfo.fullName}
              </p>
              <p>
                <span className="font-medium">Phone:</span>{" "}
                {onboardingData.personalInfo.phone}
              </p>
              <p>
                <span className="font-medium">Email:</span> {userEmail}
              </p>
              <p>
                <span className="font-medium">Address:</span>{" "}
                {onboardingData.personalInfo.address},{" "}
                {onboardingData.personalInfo.city},{" "}
                {onboardingData.personalInfo.state}{" "}
                {onboardingData.personalInfo.zipCode}
              </p>
              <p>
                <span className="font-medium">Emergency Contact:</span>{" "}
                {onboardingData.personalInfo.emergencyContactName} (
                {onboardingData.personalInfo.emergencyContactRelation}) -{" "}
                {onboardingData.personalInfo.emergencyContactPhone}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Employment Information
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Start Date:</span>{" "}
                {onboardingData.employmentInfo.startDate}
              </p>
              <p>
                <span className="font-medium">Position:</span>{" "}
                {onboardingData.employmentInfo.position}
              </p>
              <p>
                <span className="font-medium">Pay:</span> $
                {onboardingData.employmentInfo.payRate}{" "}
                {onboardingData.employmentInfo.payType}
              </p>
              <p>
                <span className="font-medium">Tax Status:</span>{" "}
                {onboardingData.employmentInfo.taxStatus}
              </p>
              <p>
                <span className="font-medium">Employment Type:</span>{" "}
                {onboardingData.employmentInfo.employmentType}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Document Status</h3>
          <div className="space-y-2">
            {onboardingData.documents.map((doc) => (
              <div
                key={doc.key}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span className="text-sm">{doc.title}</span>
                <div className="flex items-center gap-2">
                  {doc.required && (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  )}
                  {doc.status === "uploaded" ? (
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800"
                    >
                      Uploaded
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not Uploaded</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Next Steps</h4>
          <p className="text-sm text-blue-700">
            After submitting your onboarding information:
          </p>
          <ul className="text-sm text-blue-700 mt-1 space-y-1">
            <li>• HR will review your documents within 24-48 hours</li>
            <li>• You'll receive email confirmation once approved</li>
            <li>• Training materials will be provided</li>
            <li>• Your driver account will be activated</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Driver Onboarding
          </h1>
          <p className="text-gray-600">
            Welcome to Move Around TMS! Complete your onboarding to get started.
          </p>
        </div>

        {renderStepIndicator()}

        <div className="mb-8">
          {currentStep === 1 && renderPersonalInfoStep()}
          {currentStep === 2 && renderEmploymentInfoStep()}
          {currentStep === 3 && renderDocumentsStep()}
          {currentStep === 4 && renderReviewStep()}
        </div>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            Previous
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={saveCurrentStep}
              disabled={loading}
            >
              Save Progress
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                disabled={loading}
              >
                Next Step
              </Button>
            ) : (
              <Button
                onClick={completeOnboarding}
                disabled={loading || getDocumentCompletionPercentage() < 100}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? "Submitting..." : "Complete Onboarding"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
