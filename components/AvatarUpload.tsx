"use client";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Camera, Trash2, Upload, User } from "lucide-react";

interface User {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

interface AvatarUploadProps {
  user: User;
  onUpload?: (url: string) => void;
  // Legacy props for backwards compatibility
  currentAvatarUrl?: string;
  userEmail?: string;
  userName?: string;
  onAvatarUpdate?: (newUrl: string | null) => void;
}

export default function AvatarUpload({ 
  user,
  onUpload,
  // Legacy props
  currentAvatarUrl, 
  userEmail, 
  userName,
  onAvatarUpdate 
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(
    user?.avatar_url || currentAvatarUrl || ""
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate initials from name or email
  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (userName) {
      return userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    if (userEmail) {
      return userEmail.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadAvatar(file);
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setAvatarUrl(data.avatar_url);
        onUpload?.(data.avatar_url);
        onAvatarUpdate?.(data.avatar_url);
        alert('✅ Avatar uploaded successfully!');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert(`❌ Upload failed: ${error}`);
    } finally {
      setUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteAvatar = async () => {
    if (!confirm('Remove your profile picture?')) {
      return;
    }

    setUploading(true);

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE',
      });

      if (response.ok) {
        setAvatarUrl('');
        onUpload?.('');
        onAvatarUpdate?.(null);
        alert('✅ Avatar removed successfully!');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Avatar delete error:', error);
      alert(`❌ Delete failed: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Picture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Avatar Display */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-gray-200">
              <AvatarImage 
                src={avatarUrl} 
                alt="Profile picture"
                className="object-cover"
              />
              <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            {/* Camera overlay on hover */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              onClick={triggerFileSelect}
            >
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Upload Controls */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={triggerFileSelect}
              disabled={uploading}
              className="flex-1"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload New'}
            </Button>
            
            {avatarUrl && (
              <Button
                onClick={deleteAvatar}
                disabled={uploading}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload guidelines */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Supported formats: JPG, PNG, GIF, WebP</p>
            <p>• Maximum file size: 5MB</p>
            <p>• Recommended: Square images (1:1 ratio)</p>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="font-medium mb-1">Current Status:</div>
          <div className="text-gray-600">
            {avatarUrl ? (
              <span className="text-green-600">✅ Custom profile picture set</span>
            ) : (
              <span className="text-gray-500">Using initials: {getInitials()}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export both default and named export for flexibility
export { AvatarUpload };
