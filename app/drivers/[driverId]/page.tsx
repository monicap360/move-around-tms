import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardContent, CardTitle } from "../../components/ui/card";


  const [profile, setProfile] = useState<any>({
    name: "",
    dob: "",
    phone: "",
    email: "",
    address: "",
    license_number: "",
    cdl_expiry: "",
    medical_expiry: "",
    twic_expiry: "",
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [aiSuggested, setAiSuggested] = useState<any>({});
  const fileInputRefs = {
    cdl: useRef<HTMLInputElement>(null),
    medical: useRef<HTMLInputElement>(null),
    twic: useRef<HTMLInputElement>(null),
  };

  // Fetch driver profile and documents from Supabase
  useEffect(() => {
    const fetchData = async () => {
      // Fetch profile
      const { data: driver, error: profileError } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', params.driverId)
        .single();
      if (driver) setProfile(driver);

      // Fetch documents
      const { data: docs, error: docsError } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', params.driverId);
      if (docs) setDocuments(docs);
    };
    fetchData();
  }, [params.driverId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setEditing(false);
    // Save updated profile to Supabase
    await supabase
      .from('drivers')
      .update(profile)
      .eq('id', params.driverId);
  };

  const handleEdit = () => setEditing(true);

  const handleApplyAiSuggestion = (field: string) => {
    if (aiSuggested[field]) {
      setProfile({ ...profile, [field]: aiSuggested[field] });
    }
  };

  // Upload document handler
  const handleUpload = async (docType: string) => {
    const ref = fileInputRefs[docType as keyof typeof fileInputRefs];
    if (!ref.current?.files?.[0]) return;
    setUploading(true);
    const file = ref.current.files[0];
    const filePath = `drivers/${params.driverId}/${docType}-${Date.now()}-${file.name}`;
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('driver-documents')
      .upload(filePath, file);
    if (uploadError) {
      setUploading(false);
      alert('Upload failed: ' + uploadError.message);
      return;
    }
    // Insert document record
    await supabase.from('driver_documents').insert({
      driver_id: params.driverId,
      doc_type: docType === 'cdl' ? 'Driver License' : docType === 'medical' ? 'Medical Certificate' : 'Other',
      image_url: uploadData?.path,
      status: 'Pending Manager Review',
    });
    setUploading(false);
    // Refresh documents
    const { data: docs } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', params.driverId);
    if (docs) setDocuments(docs);
    if (ref.current) ref.current.value = "";
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <h1 className="text-4xl font-bold text-slate-800 mb-2">Driver Profile</h1>
      <p className="text-lg text-slate-500 mb-6">Upload and manage CDL, Medical Card, TWIC, and other documents.</p>
      <Card className="w-full max-w-2xl mb-8">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(profile).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span>
                {editing ? (
                  <input
                    className="border rounded px-2 py-1 text-sm"
                    name={key}
                    value={value}
                    onChange={handleInputChange}
                  />
                ) : (
                  <span>{value}</span>
                )}
                {aiSuggested[key] && !editing && (
                  <button
                    className="ml-2 text-xs text-blue-600 underline"
                    onClick={() => handleApplyAiSuggestion(key)}
                  >
                    Apply AI Suggestion
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            {editing ? (
              <button className="btn btn-primary mr-2" onClick={handleSave}>Save</button>
            ) : (
              <button className="btn btn-secondary" onClick={handleEdit}>Edit</button>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="w-full max-w-2xl mb-8">
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>CDL (front/back)</span>
              <input type="file" ref={fileInputRefs.cdl} className="hidden" accept="image/*,application/pdf" onChange={() => handleUpload('cdl')} />
              <button className="btn btn-primary" onClick={() => fileInputRefs.cdl.current?.click()} disabled={uploading}>Upload</button>
            </div>
            <div className="flex items-center justify-between">
              <span>Medical Card</span>
              <input type="file" ref={fileInputRefs.medical} className="hidden" accept="image/*,application/pdf" onChange={() => handleUpload('medical')} />
              <button className="btn btn-primary" onClick={() => fileInputRefs.medical.current?.click()} disabled={uploading}>Upload</button>
            </div>
            <div className="flex items-center justify-between">
              <span>TWIC Card</span>
              <input type="file" ref={fileInputRefs.twic} className="hidden" accept="image/*,application/pdf" onChange={() => handleUpload('twic')} />
              <button className="btn btn-primary" onClick={() => fileInputRefs.twic.current?.click()} disabled={uploading}>Upload</button>
            </div>
            {/* TODO: Add more document types as needed */}
          </div>
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Uploaded Documents</h4>
            <ul className="list-disc ml-6">
              {documents.map(doc => (
                <li key={doc.id} className="mb-1">
                  {doc.doc_type}: <a href={doc.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a> (Status: {doc.status})
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Compliance & Expirations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="font-semibold">CDL Expiry:</span> {profile.cdl_expiry}</div>
            <div><span className="font-semibold">Medical Card Expiry:</span> {profile.medical_expiry}</div>
            <div><span className="font-semibold">TWIC Expiry:</span> {profile.twic_expiry}</div>
            {/* TODO: Add more compliance fields as needed */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
  );
}
