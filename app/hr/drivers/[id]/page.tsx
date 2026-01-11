"use client";
export const dynamic = "force-dynamic";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  ArrowLeft,
  Car,
  Shield,
  TrendingUp,
  Heart,
  Briefcase,
} from "lucide-react";

type DriverProfile = {
  id: string;
  name: string;
  employee_id: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  date_of_birth: string;
  hire_date: string;
  status: string;

  // CDL Information
  cdl_number: string;
  cdl_class: string;
  cdl_expiration: string;
  driver_license_state: string;
  endorsements: string[];
  restrictions: string;

  // Medical Information
  medical_cert_expiration: string;
  medical_examiner: string;
  medical_restrictions: string;

  // Emergency Contact
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;

  // Employment Information
  years_experience: number;
  previous_employers: string;
  position: string;
  department: string;
  supervisor: string;
  pay_rate: number;
  pay_type: string;

  // Performance Metrics
  safety_score: number;
  total_miles: number;
  accident_count: number;
  violation_count: number;
  last_violation_date: string | null;
  on_time_percentage: number;
  fuel_efficiency: number;

  // Training & Certifications
  hazmat_cert: boolean;
  hazmat_expiration: string;
  defensive_driving_cert: boolean;
  defensive_driving_expiration: string;

  // Other
  notes: string;
  created_at: string;
  updated_at: string;
};

type Document = {
  id: string;
  doc_type: string;
  status: string;
  expiration_date: string | null;
  created_at: string;
  file_path: string;
};

export default function DriverProfilePage() {
  const params = useParams();
  const driverId = params?.id as string;

  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (driverId) {
      loadDriverProfile();
    }
  }, [driverId]);

  async function loadDriverProfile() {
    try {
      // Load driver profile
      const { data: driverData, error: driverError } = await supabase
        .from("drivers_enhanced")
        .select("*")
        .eq("id", driverId);

      if (driverError) {
        console.error("Error loading driver:", driverError);
        return;
      }

      // Parse JSON fields
      let driverProfile: DriverProfile = { ...driverData };
      if (
        driverData.endorsements &&
        typeof driverData.endorsements === "string"
      ) {
        try {
          driverProfile.endorsements = JSON.parse(driverData.endorsements);
        } catch {
          driverProfile.endorsements = [];
        }
      }
      setDriver(driverProfile);

      // Load driver documents
      const { data: docsData, error: docsError } = await supabase
        .from("driver_documents")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (!docsError && docsData) {
        setDocuments(docsData);
      }
    } catch (err) {
      console.error("Error loading driver profile:", err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Inactive":
        return "bg-gray-100 text-gray-800";
      case "On Leave":
        return "bg-yellow-100 text-yellow-800";
      case "Terminated":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function getSafetyScoreColor(score: number) {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-yellow-600";
    return "text-red-600";
  }

  function isExpiringSoon(date: string | null) {
    if (!date) return false;
    const expDate = new Date(date);
    const today = new Date();
    const daysUntilExpiration = Math.ceil(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysUntilExpiration <= 60; // Expiring within 60 days
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading driver profile...</div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="p-8">
        <div className="text-red-500">Driver not found</div>
        <Link href="/hr/drivers">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Drivers
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link href="/hr/drivers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{driver.name}</h1>
            <p className="text-gray-600">Employee ID: {driver.employee_id}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getStatusColor(driver.status)}>
                {driver.status}
              </Badge>
              {driver.position && (
                <Badge variant="outline">{driver.position}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/hr/drivers/${driver.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
          <Link href={`/hr/upload?driverId=${driver.id}`}>
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Safety Score</p>
                <p
                  className={`text-2xl font-bold ${getSafetyScoreColor(driver.safety_score)}`}
                >
                  {driver.safety_score || "N/A"}
                </p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Miles</p>
                <p className="text-2xl font-bold">
                  {driver.total_miles
                    ? `${(driver.total_miles / 1000).toFixed(0)}k`
                    : "0"}
                </p>
              </div>
              <Car className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">On-Time %</p>
                <p className="text-2xl font-bold text-blue-600">
                  {driver.on_time_percentage || "N/A"}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Documents</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Date of Birth
                    </label>
                    <p className="text-sm">
                      {driver.date_of_birth
                        ? new Date(driver.date_of_birth).toLocaleDateString()
                        : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Phone
                    </label>
                    <p className="text-sm flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {driver.phone}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Email
                  </label>
                  <p className="text-sm flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {driver.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Address
                  </label>
                  <p className="text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {driver.address}, {driver.city}, {driver.state} {driver.zip}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Name
                  </label>
                  <p className="text-sm">
                    {driver.emergency_contact_name || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Phone
                  </label>
                  <p className="text-sm flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {driver.emergency_contact_phone || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Relationship
                  </label>
                  <p className="text-sm">
                    {driver.emergency_contact_relationship || "Not provided"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CDL Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                CDL Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    CDL Number
                  </label>
                  <p className="text-sm font-mono">{driver.cdl_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Class
                  </label>
                  <p className="text-sm">Class {driver.cdl_class}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Issuing State
                  </label>
                  <p className="text-sm">{driver.driver_license_state}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Expiration Date
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm">
                      {new Date(driver.cdl_expiration).toLocaleDateString()}
                    </p>
                    {isExpiringSoon(driver.cdl_expiration) && (
                      <Badge variant="destructive" className="text-xs">
                        Expiring Soon
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">
                    Endorsements
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {driver.endorsements && driver.endorsements.length > 0 ? (
                      driver.endorsements.map((endorsement, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {endorsement}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">No endorsements</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Employment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Hire Date
                  </label>
                  <p className="text-sm">
                    {new Date(driver.hire_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Years Experience
                  </label>
                  <p className="text-sm">
                    {driver.years_experience || "Not provided"} years
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Position
                  </label>
                  <p className="text-sm">{driver.position || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Department
                  </label>
                  <p className="text-sm">
                    {driver.department || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Supervisor
                  </label>
                  <p className="text-sm">
                    {driver.supervisor || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Pay Rate
                  </label>
                  <p className="text-sm">
                    {driver.pay_rate
                      ? `$${driver.pay_rate}${driver.pay_type === "hourly" ? "/hour" : driver.pay_type === "mileage" ? "/mile" : ""}`
                      : "Not provided"}
                  </p>
                </div>
              </div>
              {driver.notes && (
                <div className="mt-6">
                  <label className="text-sm font-medium text-gray-500">
                    Notes
                  </label>
                  <p className="text-sm bg-gray-50 p-3 rounded-md mt-1">
                    {driver.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Certifications & Medical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Medical Certificate */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium">DOT Medical Certificate</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Expiration Date
                      </label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm">
                          {driver.medical_cert_expiration
                            ? new Date(
                                driver.medical_cert_expiration,
                              ).toLocaleDateString()
                            : "Not provided"}
                        </p>
                        {driver.medical_cert_expiration &&
                          isExpiringSoon(driver.medical_cert_expiration) && (
                            <Badge variant="destructive" className="text-xs">
                              Expiring Soon
                            </Badge>
                          )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Examiner
                      </label>
                      <p className="text-sm">
                        {driver.medical_examiner || "Not provided"}
                      </p>
                    </div>
                  </div>
                  {driver.medical_restrictions && (
                    <div className="mt-2">
                      <label className="text-sm font-medium text-gray-500">
                        Restrictions
                      </label>
                      <p className="text-sm text-orange-600">
                        {driver.medical_restrictions}
                      </p>
                    </div>
                  )}
                </div>

                {/* HAZMAT */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">HAZMAT Certification</h4>
                    <Badge
                      variant={driver.hazmat_cert ? "default" : "secondary"}
                    >
                      {driver.hazmat_cert ? "Certified" : "Not Certified"}
                    </Badge>
                  </div>
                  {driver.hazmat_cert && driver.hazmat_expiration && (
                    <div className="mt-2">
                      <label className="text-sm font-medium text-gray-500">
                        Expiration Date
                      </label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm">
                          {new Date(
                            driver.hazmat_expiration,
                          ).toLocaleDateString()}
                        </p>
                        {isExpiringSoon(driver.hazmat_expiration) && (
                          <Badge variant="destructive" className="text-xs">
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Defensive Driving */}
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Defensive Driving</h4>
                    <Badge
                      variant={
                        driver.defensive_driving_cert ? "default" : "secondary"
                      }
                    >
                      {driver.defensive_driving_cert
                        ? "Certified"
                        : "Not Certified"}
                    </Badge>
                  </div>
                  {driver.defensive_driving_cert &&
                    driver.defensive_driving_expiration && (
                      <div className="mt-2">
                        <label className="text-sm font-medium text-gray-500">
                          Expiration Date
                        </label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm">
                            {new Date(
                              driver.defensive_driving_expiration,
                            ).toLocaleDateString()}
                          </p>
                          {isExpiringSoon(
                            driver.defensive_driving_expiration,
                          ) && (
                            <Badge variant="destructive" className="text-xs">
                              Expiring Soon
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Safety Score
                  </label>
                  <p
                    className={`text-2xl font-bold ${getSafetyScoreColor(driver.safety_score)}`}
                  >
                    {driver.safety_score || "N/A"}/100
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    On-Time Delivery
                  </label>
                  <p className="text-lg font-semibold text-blue-600">
                    {driver.on_time_percentage || "N/A"}%
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Fuel Efficiency
                  </label>
                  <p className="text-lg font-semibold text-green-600">
                    {driver.fuel_efficiency || "N/A"} MPG
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Total Miles Driven
                  </label>
                  <p className="text-lg font-semibold">
                    {driver.total_miles
                      ? driver.total_miles.toLocaleString()
                      : "N/A"}{" "}
                    miles
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Safety Record
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Accident Count
                  </label>
                  <p className="text-2xl font-bold text-red-600">
                    {driver.accident_count || 0}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Moving Violations
                  </label>
                  <p className="text-2xl font-bold text-orange-600">
                    {driver.violation_count || 0}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Last Violation
                  </label>
                  <p className="text-sm">
                    {driver.last_violation_date
                      ? new Date(
                          driver.last_violation_date,
                        ).toLocaleDateString()
                      : "None on record"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Driver Documents ({documents.length})
                </div>
                <Link href={`/hr/upload?driverId=${driver.id}`}>
                  <Button size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No documents uploaded yet</p>
                  <Link href={`/hr/upload?driverId=${driver.id}`}>
                    <Button className="mt-4">Upload First Document</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3">Document Type</th>
                        <th className="text-left p-3">Uploaded</th>
                        <th className="text-left p-3">Expires</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{doc.doc_type}</td>
                          <td className="p-3">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            {doc.expiration_date ? (
                              <div className="flex items-center gap-2">
                                {new Date(
                                  doc.expiration_date,
                                ).toLocaleDateString()}
                                {isExpiringSoon(doc.expiration_date) && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Expiring Soon
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </td>
                          <td className="p-3">
                            <Badge
                              className={
                                doc.status === "Approved"
                                  ? "bg-green-100 text-green-800"
                                  : doc.status === "Denied"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {doc.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
