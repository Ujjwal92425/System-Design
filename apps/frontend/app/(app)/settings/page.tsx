'use client';

import React, { useState, useRef, FormEvent } from 'react';
import { useAuth } from '../../../features/auth/useAuth';
import { useAuthStore } from '../../../features/auth/authStore';
import { api } from '../../../lib/api';
import { 
  User as UserIcon, 
  Lock, 
  Trash2, 
  Upload, 
  AlertTriangle, 
  Check, 
  Loader2, 
  Camera 
} from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { setUser } = useAuthStore();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  
  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Avatar upload state
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account Deletion modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Handle Profile Update
  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(false);
    setProfileError(null);
    try {
      const res = await api.patch('/users/profile', { name, bio, avatarUrl });
      const updatedProfile = res.data.data.profile;
      setUser({
        ...user!,
        name: updatedProfile.name,
        bio: updatedProfile.bio,
        avatarUrl: updatedProfile.avatarUrl,
      });
      setProfileSuccess(true);
    } catch (err: any) {
      setProfileError(err.response?.data?.error?.message || err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  }

  // Handle Password Update
  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    setPasswordLoading(true);
    setPasswordSuccess(false);
    setPasswordError(null);
    try {
      await api.patch('/users/password', { currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.error?.message || err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  }

  // Handle Avatar File Upload
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    setProfileError(null);
    try {
      // 1. Get presigned upload URL
      const res = await api.post('/users/avatar/upload-url', {
        filename: file.name,
        contentType: file.type,
      });
      const { presignedUrl, publicUrl } = res.data.data;

      // 2. Put file to presigned URL
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage provider.');
      }

      // 3. Update local state
      setAvatarUrl(publicUrl);
      
      // Auto-save the new avatar to the user's profile
      const updateRes = await api.patch('/users/profile', { avatarUrl: publicUrl });
      const updatedProfile = updateRes.data.data.profile;
      setUser({
        ...user!,
        avatarUrl: updatedProfile.avatarUrl,
      });
      setProfileSuccess(true);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to upload avatar');
    } finally {
      setAvatarLoading(false);
    }
  }

  // Handle Account Deletion
  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      await api.delete('/users/account');
      await logout();
      window.location.href = '/login';
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete account');
      setDeleteLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-12 space-y-10">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-yc-text">Settings</h1>
        <p className="text-sm text-yc-text-muted mt-1">Manage your account preferences, profile details, and security.</p>
      </div>

      {/* Tabs Nav */}
      <div className="flex border-b border-yc-border space-x-8">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 text-sm font-semibold transition-all relative ${
            activeTab === 'profile' 
              ? 'text-yc-accent' 
              : 'text-yc-text-muted hover:text-yc-text'
          }`}
        >
          {activeTab === 'profile' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yc-accent rounded-full" />
          )}
          <span className="flex items-center space-x-2">
            <UserIcon className="w-4 h-4" />
            <span>Profile Details</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-4 text-sm font-semibold transition-all relative ${
            activeTab === 'security' 
              ? 'text-yc-accent' 
              : 'text-yc-text-muted hover:text-yc-text'
          }`}
        >
          {activeTab === 'security' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yc-accent rounded-full" />
          )}
          <span className="flex items-center space-x-2">
            <Lock className="w-4 h-4" />
            <span>Security & Password</span>
          </span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'profile' ? (
        <div className="space-y-8">
          {/* Profile Form */}
          <form onSubmit={handleProfileSubmit} className="space-y-6 bg-white border border-yc-border rounded-2xl p-8">
            <div className="flex items-center space-x-8">
              {/* Avatar Upload */}
              <div className="relative group flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-yc-border bg-yc-bg-card flex items-center justify-center font-bold text-3xl text-yc-text-muted relative">
                  {avatarLoading ? (
                    <Loader2 className="w-8 h-8 text-yc-accent animate-spin" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.name ? user.name[0].toUpperCase() : user?.email[0].toUpperCase()}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-gray-900/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-200 text-xs text-white font-semibold"
                >
                  <Camera className="w-5 h-5 mb-1" />
                  Update
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div>
                <h3 className="text-md font-semibold text-yc-text">Avatar Image</h3>
                <p className="text-xs text-yc-text-muted mt-1">
                  Upload a custom square avatar, or keep the default. Supports PNG, JPG, or SVG up to 2MB.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-3 py-1.5 bg-yc-bg-card hover:bg-yc-border text-yc-text rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose file</span>
                </button>
              </div>
            </div>

            {profileError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-4 rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs p-4 rounded-xl flex items-center space-x-2">
                <Check className="w-4 h-4" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-semibold text-yc-text-muted uppercase tracking-wider mb-2">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-white border border-yc-border rounded-xl px-4 py-3 text-sm text-yc-text focus:outline-none focus:border-yc-accent transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-yc-text-muted uppercase tracking-wider mb-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full bg-white border border-yc-border rounded-xl px-4 py-3 text-sm text-yc-text focus:outline-none focus:border-yc-accent transition resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-6 py-2.5 bg-yc-accent hover:bg-yc-accent-hover disabled:bg-yc-accent/50 text-white rounded-xl text-sm font-semibold transition flex items-center space-x-2"
              >
                {profileLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="border border-red-200 bg-red-50 rounded-2xl p-8 space-y-6">
            <div>
              <h3 className="text-md font-bold text-red-600 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Danger Zone</span>
              </h3>
              <p className="text-xs text-red-500 mt-1">
                Once deleted, your account cannot be recovered. Your progress, interviews, and designs will be scheduled for purge.
              </p>
            </div>

            {!showDeleteModal ? (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            ) : (
              <div className="p-4 bg-white rounded-xl border border-red-200 space-y-4">
                <p className="text-xs text-gray-700 font-medium">Are you absolutely sure you want to delete your account?</p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5"
                  >
                    {deleteLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Confirm Delete</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleteLoading}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="space-y-6 bg-white border border-yc-border rounded-2xl p-8">
          {passwordError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-4 rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs p-4 rounded-xl flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>Password changed successfully!</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-yc-text-muted uppercase tracking-wider mb-2">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-yc-border rounded-xl px-4 py-3 text-sm text-yc-text focus:outline-none focus:border-yc-accent transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-yc-text-muted uppercase tracking-wider mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-yc-border rounded-xl px-4 py-3 text-sm text-yc-text focus:outline-none focus:border-yc-accent transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-yc-text-muted uppercase tracking-wider mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-yc-border rounded-xl px-4 py-3 text-sm text-yc-text focus:outline-none focus:border-yc-accent transition"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-6 py-2.5 bg-yc-accent hover:bg-yc-accent-hover disabled:bg-yc-accent/50 text-white rounded-xl text-sm font-semibold transition flex items-center space-x-2"
            >
              {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
