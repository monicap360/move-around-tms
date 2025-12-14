
"use client";
export const dynamic = 'force-dynamic';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  Users,
  Shield,
  Truck,
  GraduationCap,
  Briefcase,
  Heart,
  Save,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";

type OnboardingDetails = {
  onboarding_id: string;
  driver_id: string;
  driver_name: string;
  employee_id: string;
  onboarding_status: string;
  started_date: string;
  target_completion_date: string;
  actual_completion_date: string | null;
  assigned_hr_rep: string | null;
  template_name: string;
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  blocking_steps: number;
  completion_percentage: number;
};

type OnboardingStep = {
  step_id: string;
  step_order: number;
  title: string;
  description: string;
  category: string;
  required_for_activation: boolean;
  estimated_duration_minutes: number;
  assigned_department: string;
  instructions: string;
  completion_status: string;
  completed_by: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  required_documents: string[];
  uploaded_documents: string[];
};

export default function OnboardingDetailsPage() {
  const params = useParams();
  const onboardingId = params?.id as string;
  
  const [onboarding, setOnboarding] = useState<OnboardingDetails | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (onboardingId) {
      loadOnboardingDetails();
    }
  }, [onboardingId]);

  async function loadOnboardingDetails() {
    try {
      // Load onboarding summary
      const { data: onboardingData, error: onboardingError } = await supabase
        .from("onboarding_progress_summary")
        .select("*")
        .eq("onboarding_id", onboardingId)
        .single();

      if (onboardingError) {
        console.error("Error loading onboarding:", onboardingError);
        return;
      }

      setOnboarding(onboardingData);

      // Load detailed steps
      const { data: stepsData, error: stepsError } = await supabase
        .from("onboarding_step_completion")
        .select(`
          step_id,
          status as completion_status,
          completed_by,
          completed_at,
          notes as completion_notes,
          required_documents,
          uploaded_documents,
          onboarding_steps (
            step_order,
            title,
            description,
            category,
            required_for_activation,
            estimated_duration_minutes,
            assigned_department,
            instructions
          )
        `)
        .eq("onboarding_id", onboardingId)
        .order("onboarding_steps(step_order)");

      if (stepsError) {
        console.error("Error loading steps:", stepsError);
        return;
      }

      // Transform the data
      const transformedSteps = (stepsData || []).map((item: any) => ({
        step_id: item.step_id,
        completion_status: item.completion_status,
        completed_by: item.completed_by,
        completed_at: item.completed_at,
        completion_notes: item.completion_notes,
        required_documents: item.required_documents || [],
        uploaded_documents: item.uploaded_documents || [],
        step_order: item.onboarding_steps.step_order,
        title: item.onboarding_steps.title,
        description: item.onboarding_steps.description,
        category: item.onboarding_steps.category,
        required_for_activation: item.onboarding_steps.required_for_activation,
        estimated_duration_minutes: item.onboarding_steps.estimated_duration_minutes,
        assigned_department: item.onboarding_steps.assigned_department,
        instructions: item.onboarding_steps.instructions
      })).sort((a: any, b: any) => a.step_order - b.step_order);

      setSteps(transformedSteps);

    } catch (err) {
      console.error("Error loading onboarding details:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStepStatus(stepId: string, newStatus: string, notes?: string) {
    setUpdating(stepId);
    try {
      const updateData: any = {
        status: newStatus,
        notes: notes || null
      };

      if (newStatus === 'Completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = 'Current User'; // Replace with actual user
      }

      const { error } = await supabase
        .from("onboarding_step_completion")
        .update(updateData)
        .eq("onboarding_id", onboardingId)
        .eq("step_id", stepId);

      if (error) {
        console.error("Error updating step:", error);
        alert("Error updating step: " + error.message);
        return;
      }

      // Reload data to get updated progress
      await loadOnboardingDetails();

    } catch (err) {
      console.error("Error updating step:", err);
      alert("Unexpected error updating step");
    } finally {
      setUpdating(null);
    }
  }

  function getStatusIcon(status: string) {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'skipped':
        return <div className="w-5 h-5 rounded-full bg-gray-300" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in progress': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'skipped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  }

  function getCategoryIcon(category: string) {
    switch (category.toLowerCase()) {
      case 'hr': return <User className="w-4 h-4" />;
      case 'safety': return <Shield className="w-4 h-4" />;
      case 'training': return <GraduationCap className="w-4 h-4" />;
      case 'operations': return <Truck className="w-4 h-4" />;
      case 'documentation': return <FileText className="w-4 h-4" />;
      case 'equipment': return <Briefcase className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  }

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading onboarding details...</div>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="p-8">
        <div className="text-red-500">Onboarding process not found</div>
        <Link href="/hr/onboarding">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Onboarding
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
          <Link href="/hr/onboarding">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{onboarding.driver_name}</h1>
            <p className="text-gray-600">
              Employee ID: {onboarding.employee_id} • {onboarding.template_name}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getStatusColor(onboarding.onboarding_status)}>
                {onboarding.onboarding_status}
              </Badge>
              {onboarding.assigned_hr_rep && (
                <Badge variant="outline">HR Rep: {onboarding.assigned_hr_rep}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/hr/drivers/${onboarding.driver_id}`}>
            <Button variant="outline">
              <User className="w-4 h-4 mr-2" />
              View Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{onboarding.completion_percentage}%</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{onboarding.completed_steps}</div>
              <div className="text-sm text-gray-600">Completed Steps</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">{onboarding.total_steps - onboarding.completed_steps}</div>
              <div className="text-sm text-gray-600">Remaining Steps</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${onboarding.blocking_steps > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {onboarding.blocking_steps}
              </div>
              <div className="text-sm text-gray-600">Blocking Steps</div>
            </div>
          </div>
          
          <Progress value={onboarding.completion_percentage} className="h-3 mb-4" />
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>Started: {new Date(onboarding.started_date).toLocaleDateString()}</span>
            <span>
              Target: {new Date(onboarding.target_completion_date).toLocaleDateString()}
              {onboarding.actual_completion_date && (
                <span className="ml-4 text-green-600">
                  Completed: {new Date(onboarding.actual_completion_date).toLocaleDateString()}
                </span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {steps.map((step) => (
              <div key={step.step_id} className={`border rounded-lg p-6 ${
                step.completion_status === 'Completed' ? 'bg-green-50 border-green-200' :
                step.completion_status === 'Failed' ? 'bg-red-50 border-red-200' :
                step.completion_status === 'In Progress' ? 'bg-blue-50 border-blue-200' :
                'bg-white'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-gray-400">
                        {step.step_order}
                      </span>
                      {getStatusIcon(step.completion_status)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{step.title}</h3>
                        {step.required_for_activation && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          {getCategoryIcon(step.category)}
                          {step.category}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{step.description}</p>
                      
                      {step.instructions && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                          <h4 className="text-sm font-medium text-blue-800 mb-1">Instructions:</h4>
                          <p className="text-sm text-blue-700">{step.instructions}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(step.estimated_duration_minutes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {step.assigned_department}
                        </span>
                        {step.completed_by && step.completed_at && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            Completed by {step.completed_by} on {new Date(step.completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Documents Section */}
                      {step.required_documents.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Required Documents:</h4>
                          <div className="flex flex-wrap gap-2">
                            {step.required_documents.map((doc, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                {doc}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {step.completion_notes && (
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Notes:</h4>
                          <p className="text-sm text-gray-600">{step.completion_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 ml-4">
                    <Badge className={getStatusColor(step.completion_status)}>
                      {step.completion_status}
                    </Badge>
                    
                    {step.completion_status !== 'Completed' && (
                      <div className="flex flex-col gap-1">
                        {step.completion_status === 'Pending' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateStepStatus(step.step_id, 'In Progress')}
                            disabled={updating === step.step_id}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                        )}
                        
                        {step.completion_status === 'In Progress' && (
                          <>
                            <Button 
                              size="sm"
                              onClick={() => updateStepStatus(step.step_id, 'Completed')}
                              disabled={updating === step.step_id}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateStepStatus(step.step_id, 'Failed')}
                              disabled={updating === step.step_id}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Mark Failed
                            </Button>
                          </>
                        )}
                        
                        {step.completion_status === 'Failed' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateStepStatus(step.step_id, 'In Progress')}
                            disabled={updating === step.step_id}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Retry
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}