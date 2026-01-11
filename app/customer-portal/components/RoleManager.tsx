"use client";
import { useState } from "react";
import { Button } from "../../components/ui/button";

const roles = [
  { value: "admin", label: "Admin" },
  { value: "user", label: "User" },
  { value: "accountant", label: "Accountant" },
  { value: "custom", label: "Custom" }
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const initialUsers: User[] = [
  { id: "1", name: "John Smith", email: "john@company.com", role: "admin" },
  { id: "2", name: "Jane Doe", email: "jane@company.com", role: "user" }
];

export default function RoleManager() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [editing, setEditing] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");

  const handleEdit = (id: string, currentRole: string) => {
    setEditing(id);
    setRole(currentRole);
  };
  const handleSave = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    setEditing(null);
  };

  return (
    <div className="bg-white rounded shadow p-6">
      <h2 className="text-xl font-bold mb-4">User Roles & Permissions</h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Role</th>
            <th className="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">
                {editing === u.id ? (
                  <select value={role} onChange={e => setRole(e.target.value)} className="border rounded px-2 py-1">
                    {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                ) : (
                  <span className="capitalize font-semibold">{roles.find(r => r.value === u.role)?.label || u.role}</span>
                )}
              </td>
              <td className="p-2">
                {editing === u.id ? (
                  <Button size="sm" onClick={() => handleSave(u.id)}>Save</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleEdit(u.id, u.role)}>Edit</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-gray-500 mt-4">Granular permissions and custom roles can be managed in the admin dashboard.</div>
    </div>
  );
}
