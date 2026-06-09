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
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage your account preferences, profile details, and security.</p>
      </div>

      {/* Tabs Nav */}
      <div className="flex border-b border-zinc-800 space-x-8">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 text-sm font-semibold transition-all relative ${
            activeTab === 'profile' 
              ? 'text-indigo-400' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {activeTab === 'profile' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
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
              ? 'text-indigo-400' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {activeTab === 'security' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
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
          <form onSubmit={handleProfileSubmit} className="space-y-6 bg-zinc-900/30 border border-zinc-900/80 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center space-x-8">
              {/* Avatar Upload */}
              <div className="relative group flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-850 bg-zinc-950 flex items-center justify-center font-bold text-3xl text-zinc-400 relative">
                  {avatarLoading ? (
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.name ? user.name[0].toUpperCase() : user?.email[0].toUpperCase()}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-200 text-xs text-zinc-300 font-semibold"
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
                <h3 className="text-md font-semibold text-zinc-205">Avatar Image</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Upload a custom square avatar, or keep the default. Supports PNG, JPG, or SVG up to 2MB.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose file</span>
                </button>
              </div>
            </div>

            {profileError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-center space-x-2 animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-xl flex items-center space-x-2">
                <Check className="w-4 h-4" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl text-sm font-semibold transition flex items-center space-x-2"
              >
                {profileLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="border border-red-500/10 bg-red-500/5 rounded-2xl p-8 space-y-6">
            <div>
              <h3 className="text-md font-bold text-red-400 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Danger Zone</span>
              </h3>
              <p className="text-xs text-red-300/80 mt-1">
                Once deleted, your account cannot be recovered. Your progress, interviews, and designs will be scheduled for purge.
              </p>
            </div>

            {!showDeleteModal ? (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            ) : (
              <div className="p-4 bg-zinc-950/50 rounded-xl border border-red-500/20 space-y-4">
                <p className="text-xs text-zinc-300 font-medium">Are you absolutely sure you want to delete your account?</p>
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
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="space-y-6 bg-zinc-900/30 border border-zinc-900/80 rounded-2xl p-8 shadow-sm">
          {passwordError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-xl flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>Password changed successfully!</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl text-sm font-semibold transition flex items-center space-x-2"
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
