"use client";
import { useState } from "react";
// Try both alias and relative import for supabase client
import { supabase } from "../../lib/supabaseClient";
// import { supabase } from "../lib/supabaseClient";
import "../styles.css";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleChangePassword(e: any) {
    e.preventDefault();
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("❌ New passwords do not match.");
      return;
    }

    setLoading(true);

    // Get current user
    const userRes = await supabase.auth.getUser();
    const user = userRes.data.user;
    if (!user || !user.email) {
      setMessage("❌ No user is currently logged in.");
      setLoading(false);
      return;
    }

    // Reauthenticate user with current password
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

    if (signInError) {
      setMessage("❌ Incorrect current password.");
      setLoading(false);
      return;
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);
    if (updateError) {
      setMessage("❌ " + updateError.message);
    } else {
      setMessage("✅ Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <div className="veronica-dashboard">
      <h2 className="section-title">Change Password</h2>

      <form className="data-form" onSubmit={handleChangePassword}>
        <label>Current Password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />

        <label>New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        <label>Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Updating..." : "Change Password"}
        </button>
      </form>

      {message && <p className="status-message">{message}</p>}
    </div>
  );
}
