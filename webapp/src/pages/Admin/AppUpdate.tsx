import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

interface AppUpdateSettings {
  latestVersion: string;
  minRequiredVersion: string;
  showUpdateModal: boolean;
  updateMessage: string;
  actionUrl: string | null;
}

export default function AppUpdate() {
  const [settings, setSettings] = useState<AppUpdateSettings>({
    latestVersion: '1.0.0',
    minRequiredVersion: '1.0.0',
    showUpdateModal: false,
    updateMessage: 'A new version is available. Please update to continue.',
    actionUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings/app-update');
      setSettings({
        latestVersion: data.latestVersion || '1.0.0',
        minRequiredVersion: data.minRequiredVersion || '1.0.0',
        showUpdateModal: data.showUpdateModal || false,
        updateMessage: data.updateMessage || 'A new version is available. Please update to continue.',
        actionUrl: data.actionUrl || ''
      });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load App Update Settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings/app-update', settings);
      toast.success('App Update Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Mobile App Update Settings</h1>
      
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Global Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div>
              <h3 className="font-semibold">Enable Update Modal</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Turn this on to show the update prompt in the mobile app.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.showUpdateModal}
                onChange={(e) => setSettings({ ...settings, showUpdateModal: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
            </label>
          </div>

          {/* Versions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Latest Version</label>
              <input
                type="text"
                value={settings.latestVersion}
                onChange={(e) => setSettings({ ...settings, latestVersion: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent"
                placeholder="e.g. 1.0.5"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Users below this version will see an optional update prompt.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Minimum Required Version</label>
              <input
                type="text"
                value={settings.minRequiredVersion}
                onChange={(e) => setSettings({ ...settings, minRequiredVersion: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent"
                placeholder="e.g. 1.0.0"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Users below this version will be forced to update.</p>
            </div>
          </div>

          {/* Update Message */}
          <div>
            <label className="block text-sm font-medium mb-1">Update Message</label>
            <textarea
              value={settings.updateMessage}
              onChange={(e) => setSettings({ ...settings, updateMessage: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent h-24"
              required
            />
          </div>

          {/* Action URL (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-1">Action URL (Optional)</label>
            <input
              type="url"
              value={settings.actionUrl || ''}
              onChange={(e) => setSettings({ ...settings, actionUrl: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent"
              placeholder="https://example.com/download.apk"
            />
            <p className="text-xs text-slate-500 mt-1">Leave blank to default to Play/App Store logic.</p>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary px-8"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
