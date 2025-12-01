"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { getAdminToken, setAdminToken as persistAdminToken, isAdminTokenExpired, setAdminTokenExpiry } from "../../lib/adminToken";
import { ErrorBanner } from "../../components/ErrorBanner";

type Role = "owner" | "admin" | "manager" | "hr" | "office" | "driver";

const ROLES: Role[] = ["owner", "admin", "manager", "hr", "office", "driver"];

type UserRow = {
  id: string;
  email: string;
  role: string;
  company: string;
};

export default function AddUserPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("office");
  const [company, setCompany] = useState("Ronyx Logistics LLC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [adminToken, setAdminTokenState] = useState(() => getAdminToken() || "");

  // Load existing users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!adminToken) {
      setError("Admin token required. Please enter your token above.");
      return;
    }
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        setError("Failed to load users. Check your admin token.");
      }
    } catch (err) {
      setError("Network error loading users.");
      console.error("Failed to load users", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!adminToken || isAdminTokenExpired()) {
      setError("Admin token required or expired. Please enter your token above.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/add-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ email, password, role, company }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add user");
      }
      setSuccess(
        `User created successfully! User ID: ${data.user.id}. ${
          data.confirmationRequired
            ? "Email confirmation required."
            : "User can sign in immediately."
        }`
      );
      setEmail("");
      setPassword("");
      setRole("office");
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    try {
      const res = await fetch("/api/admin/update-user-role", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update role");
      }

      setSuccess("Role updated successfully");
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to update role");
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;

    try {
      const res = await fetch("/api/admin/deactivate-user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to deactivate user");
      }

      setSuccess("User deactivated successfully");
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to deactivate user");
    }
  };

  // Persist admin token in localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("adminToken", adminToken);
    }
  }, [adminToken]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Admin Token Input */}
      <Card className="shadow-lg border bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Admin Token (required for all operations)
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminTokenState(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your admin token"
            />
            <button
              onClick={() => loadUsers()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Load
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Add New User Form */}
      <Card className="shadow-lg border bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle>Add New User</CardTitle>
          <p className="text-sm text-blue-100">
            Create a new user account and assign a role
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@ronyxlogistics.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Temporary Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">
                User should change this on first login
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
                <ErrorBanner message={error} />
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !adminToken}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Creating User…" : "Add User"}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Current Users Table */}
      <Card className="shadow-lg border bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle>Current Users & Roles</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingUsers && (
            <p className="text-gray-500 text-center py-4">Loading users…</p>
          )}

          {!loadingUsers && users.length === 0 && adminToken && (
            <p className="text-gray-500 text-center py-4">No users found.</p>
          )}

          {!adminToken && (
            <p className="text-gray-500 text-center py-4">
              Enter admin token above to view users
            </p>
          )}

          {!loadingUsers && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Role</th>
                    <th className="px-4 py-2 text-left">Company</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleUpdateRole(u.id, e.target.value as Role)
                          }
                          className="px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">{u.company}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeactivateUser(u.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> All operations require admin authentication.
          Users created here are auto-confirmed and can sign in immediately.
          The admin token is stored in your session for convenience.
        </p>
      </div>
    </div>
  );
}
