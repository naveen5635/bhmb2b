import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Shield, Loader2, Pencil, Check, X } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';

// ── Schemas ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name:  z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     z.string().min(6, 'At least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileData  = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [editingProfile, setEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Profile form
  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  // Keep profile form in sync if user changes elsewhere
  useEffect(() => {
    profileForm.reset({ name: user?.name ?? '', email: user?.email ?? '' });
  }, [user]);

  // Password form
  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onSaveProfile = async (data: ProfileData) => {
    setIsSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({ name: data.name, email: data.email || undefined });
      setUser(updated);
      setEditingProfile(false);
      toast({ title: 'Profile updated', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Failed to update profile', description: err?.response?.data?.error, variant: 'destructive' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onCancelEdit = () => {
    profileForm.reset({ name: user?.name ?? '', email: user?.email ?? '' });
    setEditingProfile(false);
  };

  const onSavePassword = async (data: PasswordData) => {
    setIsSavingPassword(true);
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      toast({ title: 'Password changed', description: 'Your password has been updated', variant: 'success' });
      passwordForm.reset();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.error || 'Check your current password',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Profile card ──────────────────────────────────────────────────── */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-sky-500" />
              <CardTitle className="text-lg dark:text-white">Profile</CardTitle>
            </div>
            {!editingProfile && (
              <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}
          </div>
          <CardDescription className="dark:text-gray-400">Your account information</CardDescription>
        </CardHeader>

        <CardContent>
          {/* Avatar row */}
          <div className="flex items-center gap-4 mb-5">
            <div className="bg-[#1e3a5f] rounded-full h-16 w-16 flex items-center justify-center shrink-0">
              <span className="text-white text-2xl font-bold">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{user?.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.username}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Shield className="h-3.5 w-3.5 text-sky-500" />
                <span className="text-xs font-medium text-sky-600 dark:text-sky-400 capitalize">{user?.role?.toLowerCase()}</span>
              </div>
            </div>
          </div>

          <Separator className="mb-5 dark:bg-gray-700" />

          {/* Edit form */}
          {editingProfile ? (
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="dark:text-gray-300">Full Name</Label>
                <Input id="name" placeholder="Your full name" {...profileForm.register('name')} />
                {profileForm.formState.errors.name && (
                  <p className="text-xs text-red-600">{profileForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="dark:text-gray-300">
                  Email <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </Label>
                <Input id="email" type="email" placeholder="your@email.com" {...profileForm.register('email')} />
                {profileForm.formState.errors.email && (
                  <p className="text-xs text-red-600">{profileForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="dark:text-gray-300">Username</Label>
                <Input value={user?.username ?? ''} disabled className="opacity-60 cursor-not-allowed" />
                <p className="text-xs text-gray-400">Username cannot be changed.</p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                    : <><Check className="h-4 w-4 mr-2" />Save Changes</>
                  }
                </Button>
                <Button type="button" variant="outline" onClick={onCancelEdit} disabled={isSavingProfile}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            /* Read-only view */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Full Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Username</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.username || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Account Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {user?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Member Since</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(user?.createdAt)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Change password card ───────────────────────────────────────────── */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-sky-500" />
            <CardTitle className="text-lg dark:text-white">Change Password</CardTitle>
          </div>
          <CardDescription className="dark:text-gray-400">Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onSavePassword)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword" className="dark:text-gray-300">Current Password</Label>
              <Input id="currentPassword" type="password" placeholder="Enter current password"
                {...passwordForm.register('currentPassword')} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="dark:text-gray-300">New Password</Label>
              <Input id="newPassword" type="password" placeholder="Min. 6 characters"
                {...passwordForm.register('newPassword')} />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="dark:text-gray-300">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" placeholder="Repeat new password"
                {...passwordForm.register('confirmPassword')} />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="pt-1">
              <Button type="submit" disabled={isSavingPassword}>
                {isSavingPassword
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating…</>
                  : 'Update Password'
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
