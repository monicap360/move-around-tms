"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  User,
  FileText,
  Upload,
  Award,
  Target,
  Calendar,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit,
  Save,
  X,
  Camera,
  Phone,
  Mail,
  MapPin,
  Car,
  Fuel
} from "lucide-react";

type DriverProfile = {
  id: string;
  name: string;
  employee_id: string;
  phone: string;
  email: string;
  address: string;
  cdl_number: string;
  cdl_class: string;
  cdl_expiration: string;
  hire_date: string;
  employment_status: string;
  current_safety_score: number;
  profile_image_url: string | null;
};

type DriverDocument = {
  id: string;
  doc_type: string;
  status: string;
  expiration_date: string | null;
  file_url: string | null;
  created_at: string;
};

type TrainingRecord = {
  id: string;
  training_type: string;
  completion_status: string;
  training_date: string;
  score: number | null;
  certificate_url: string | null;
};

type PerformanceGoal = {
  id: string;
  goal_type: string;
  description: string;
  target_value: number;
  current_value: number | null;
  target_date: string;
  status: string;
};

// Mock driver ID - in production, this would come from authentication
const DRIVER_ID = "mock-driver-123";

export default function DriverPortalPage() {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<DriverProfile>>({});

  useEffect(() => {
    loadDriverData();
  }, []);

  async function loadDriverData() {
    try {
      // In production, get driver data based on authentication
      // For now, we'll simulate with mock data
      setDriver({
        id: DRIVER_ID,
        name: "John Smith",
        employee_id: "DRV-001",
        phone: "(555) 123-4567",
        email: "john.smith@company.com",
        address: "123 Main St, City, ST 12345",
        cdl_number: "CDL123456789",
        cdl_class: "Class A",
        cdl_expiration: "2026-03-15",
        hire_date: "2023-01-15",
        employment_status: "active",
        current_safety_score: 92,
        profile_image_url: null
      });

      // Load mock documents
      setDocuments([
        {
          id: "1",
          doc_type: "CDL License",
          status: "current",
          expiration_date: "2026-03-15",
          file_url: "/docs/cdl-john-smith.pdf",
          created_at: "2023-01-15T10:00:00Z"
        },
        {
          id: "2",
          doc_type: "Medical Certificate",
          status: "expires_soon",
          expiration_date: "2024-12-15",
          file_url: "/docs/medical-john-smith.pdf",
          created_at: "2023-06-15T10:00:00Z"
        },
        {
          id: "3",
          doc_type: "Safety Training Certificate",
          status: "current",
          expiration_date: "2025-06-15",
          file_url: "/docs/safety-training-john-smith.pdf",
          created_at: "2024-06-15T10:00:00Z"
        }
      ]);

      // Load mock trainings
      setTrainings([
        {
          id: "1",
          training_type: "Defensive Driving",
          completion_status: "completed",
          training_date: "2024-06-15",
          score: 95,
          certificate_url: "/certs/defensive-driving-john-smith.pdf"
        },
        {
          id: "2",
          training_type: "DOT Regulations Update",
          completion_status: "in_progress",
          training_date: "2024-10-01",
          score: null,
          certificate_url: null
        },
        {
          id: "3",
          training_type: "Fuel Efficiency Training",
          completion_status: "completed",
          training_date: "2024-08-20",
          score: 88,
          certificate_url: "/certs/fuel-efficiency-john-smith.pdf"
        }
      ]);

      // Load mock goals
      setGoals([
        {
          id: "1",
          goal_type: "Safety Score",
          description: "Maintain safety score above 90",
          target_value: 90,
          current_value: 92,
          target_date: "2024-12-31",
          status: "on_track"
        },
        {
          id: "2",
          goal_type: "Fuel Efficiency",
          description: "Achieve 7.0 MPG average",
          target_value: 7.0,
          current_value: 6.8,
          target_date: "2024-12-31",
          status: "in_progress"
        }
      ]);

    } catch (err) {
      console.error("Error loading driver data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    try {
      // In production, save to Supabase
      setDriver(prev => prev ? { ...prev, ...formData } : null);
      setEditing(false);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Error updating profile");
    }
  }

  function handleEdit() {
    setFormData(driver || {});
    setEditing(true);
  }

  function handleCancelEdit() {
    setFormData({});
    setEditing(false);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800';
      case 'expires_soon': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'on_track': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getSafetyScoreColor(score: number) {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  }

  function getGoalProgress(goal: PerformanceGoal): number {
    if (!goal.current_value || goal.target_value === 0) return 0;
    return Math.min(100, (goal.current_value / goal.target_value) * 100);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading driver portal...</div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="p-8">
        <div className="text-red-500">Driver not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {driver.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Welcome, {driver.name}</h1>
                <p className="text-gray-600">Employee ID: {driver.employee_id}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="w-4 h-4" />
                  <span className={`font-medium ${getSafetyScoreColor(driver.current_safety_score)}`}>
                    Safety Score: {driver.current_safety_score}
                  </span>
                </div>
              </div>
            </div>
            <Button onClick={handleEdit} disabled={editing}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'profile', label: 'My Profile', icon: User },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'training', label: 'Training', icon: Award },
              { id: 'goals', label: 'Goals', icon: Target }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'profile' && (
          <div className="max-w-4xl space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                  {editing && (
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={handleCancelEdit} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    {editing ? (
                      <Input
                        value={formData.name || driver.name}
                        onChange={(e: any) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    ) : (
                      <p className="text-gray-900">{driver.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                    <p className="text-gray-900">{driver.employee_id}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    {editing ? (
                      <Input
                        value={formData.phone || driver.phone}
                        onChange={(e: any) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900">{driver.phone}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    {editing ? (
                      <Input
                        value={formData.email || driver.email}
                        onChange={(e: any) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900">{driver.email}</p>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    {editing ? (
                      <Input
                        value={formData.address || driver.address}
                        onChange={(e: any) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900">{driver.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CDL Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  CDL Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CDL Number</label>
                    <p className="text-gray-900">{driver.cdl_number}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CDL Class</label>
                    <p className="text-gray-900">{driver.cdl_class}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                    <p className="text-gray-900">{new Date(driver.cdl_expiration).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Employment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                    <p className="text-gray-900">{new Date(driver.hire_date).toLocaleDateString()}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                    <Badge className="bg-green-100 text-green-800 capitalize">
                      {driver.employment_status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="max-w-4xl space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    My Documents
                  </CardTitle>
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{doc.doc_type}</h3>
                          <p className="text-sm text-gray-600">
                            Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                          {doc.expiration_date && (
                            <p className="text-sm text-gray-600">
                              Expires: {new Date(doc.expiration_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(doc.status)}>
                            {doc.status.replace('_', ' ')}
                          </Badge>
                          {doc.file_url && (
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="max-w-4xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Training Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trainings.map((training) => (
                    <div key={training.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{training.training_type}</h3>
                          <p className="text-sm text-gray-600">
                            Date: {new Date(training.training_date).toLocaleDateString()}
                          </p>
                          {training.score && (
                            <p className="text-sm text-green-600 font-medium">
                              Score: {training.score}%
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(training.completion_status)}>
                            {training.completion_status.replace('_', ' ')}
                          </Badge>
                          {training.certificate_url && (
                            <Button variant="outline" size="sm">
                              <FileText className="w-4 h-4 mr-1" />
                              Certificate
                            </Button>
                          )}
                        </div>
                      </div>
                      {training.completion_status === 'in_progress' && (
                        <Button size="sm" className="mt-2">
                          Continue Training
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="max-w-4xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Performance Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {goals.map((goal) => (
                    <div key={goal.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium">{goal.goal_type}</h3>
                          <p className="text-sm text-gray-600">{goal.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Target date: {new Date(goal.target_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(goal.status)}>
                          {goal.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress: {goal.current_value || 0} / {goal.target_value}</span>
                          <span>{getGoalProgress(goal).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getGoalProgress(goal)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}