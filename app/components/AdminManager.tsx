"use client";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Trash2, UserPlus, Shield, Clock } from "lucide-react";

interface AdminUser {
  user_id: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
}

export default function AdminManager() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  async function fetchAdmins() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/list");
      const json = await res.json();
      if (res.ok) {
        setAdmins(json.admins || []);
      } else {
        console.error("Failed to fetch admins:", json.error);
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setAdding(true);
    try {
      const res = await fetch("/api/admin/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      
      const json = await res.json();
      
      if (res.ok) {
        setEmail("");
        await fetchAdmins();
        // Show success message (you can replace with toast if you have one)
        alert(`✅ Successfully added ${json.added} as admin!`);
      } else {
        alert(`❌ Error: ${json.error || "Failed to add admin"}`);
      }
    } catch (error) {
      console.error("Error adding admin:", error);
      alert("❌ Network error while adding admin");
    } finally {
      setAdding(false);
    }
  }

  async function removeAdmin(adminUser: AdminUser) {
    if (!confirm(`Remove ${adminUser.email} as admin?\n\nThis will revoke their admin access immediately.`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: adminUser.user_id }),
      });

      if (res.ok) {
        await fetchAdmins();
        alert(`✅ Removed ${adminUser.email} from admin list`);
      } else {
        const json = await res.json();
        alert(`❌ Error: ${json.error || "Failed to remove admin"}`);
      }
    } catch (error) {
      console.error("Error removing admin:", error);
      alert("❌ Network error while removing admin");
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function getRoleBadge(role: string) {
    const colors = {
      'super_admin': 'bg-purple-100 text-purple-800 border-purple-200',
      'admin': 'bg-blue-100 text-blue-800 border-blue-200',
      'default': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return colors[role as keyof typeof colors] || colors.default;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Admin Form */}
        <form onSubmit={addAdmin} className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter user email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-grow"
            disabled={adding}
            required
          />
          <Button
            type="submit"
            disabled={adding || !email.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {adding ? (
              "Adding..."
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" />
                Add Admin
              </>
            )}
          </Button>
        </form>

        {/* Admin List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Current Admins ({admins.length})</h3>
            <Button variant="outline" size="sm" onClick={fetchAdmins} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading admins...
            </div>
          ) : !admins.length ? (
            <div className="text-center py-8 text-gray-500">
              No admins found. Add the first admin above.
            </div>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <div
                  key={admin.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium">{admin.email}</span>
                      <Badge 
                        variant="outline" 
                        className={getRoleBadge(admin.role)}
                      >
                        {admin.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {!admin.active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="h-3 w-3" />
                      Added {formatDate(admin.created_at)}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAdmin(admin)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <div className="font-semibold mb-1">ℹ️ Admin Management Notes:</div>
          <ul className="space-y-1 ml-4">
            <li>• Only existing users (those who have signed up) can be made admins</li>
            <li>• Admins can upload/delete shared documents and manage other admins</li>
            <li>• You cannot remove yourself as admin</li>
            <li>• Changes take effect immediately</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
