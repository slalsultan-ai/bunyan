'use client';
import { useState } from 'react';

interface NotificationSettingsProps {
  parent: {
    achievementEmailEnabled: boolean;
    monthlyReportEnabled: boolean;
    weeklyEmailEnabled: boolean;
  };
  onUpdate: (settings: {
    achievementEmailEnabled: boolean;
    monthlyReportEnabled: boolean;
    weeklyEmailEnabled: boolean;
  }) => void;
}

interface ToggleItem {
  key: 'weeklyEmailEnabled' | 'achievementEmailEnabled' | 'monthlyReportEnabled';
  label: string;
  description: string;
}

const TOGGLES: ToggleItem[] = [
  {
    key: 'weeklyEmailEnabled',
    label: 'البريد الأسبوعي',
    description: 'تقرير أسبوعي بتقدم أطفالك وإحصائياتهم',
  },
  {
    key: 'achievementEmailEnabled',
    label: 'إشعارات الإنجاز',
    description: 'إشعار فوري عند تحقيق طفلك إنجازًا جديدًا',
  },
  {
    key: 'monthlyReportEnabled',
    label: 'التقرير الشهري',
    description: 'ملخص شامل لأداء أطفالك كل شهر',
  },
];

export default function NotificationSettings({ parent, onUpdate }: NotificationSettingsProps) {
  const [settings, setSettings] = useState({
    weeklyEmailEnabled: parent.weeklyEmailEnabled,
    achievementEmailEnabled: parent.achievementEmailEnabled,
    monthlyReportEnabled: parent.monthlyReportEnabled,
  });
  const [saving, setSaving] = useState<string | null>(null);

  const handleToggle = async (key: ToggleItem['key']) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSaving(key);

    try {
      const res = await fetch('/api/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        onUpdate(updated);
      } else {
        // Revert on failure
        setSettings(settings);
      }
    } catch {
      setSettings(settings);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-1">
      <h3 className="font-bold text-gray-900 text-lg mb-4">🔔 إعدادات الإشعارات</h3>

      {TOGGLES.map((toggle, i) => (
        <div
          key={toggle.key}
          className={`flex items-center justify-between py-4 ${
            i < TOGGLES.length - 1 ? 'border-b border-gray-100' : ''
          }`}
        >
          <div className="flex-1 min-w-0 ml-4">
            <p className="font-semibold text-gray-800 text-sm">{toggle.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{toggle.description}</p>
          </div>
          <button
            onClick={() => handleToggle(toggle.key)}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleToggle(toggle.key); } }}
            disabled={saving === toggle.key}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
              settings[toggle.key] ? 'bg-emerald-500' : 'bg-gray-300'
            } ${saving === toggle.key ? 'opacity-50' : ''}`}
            role="switch"
            aria-checked={settings[toggle.key]}
            aria-label={toggle.label}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                settings[toggle.key]
                  ? 'start-[22px]'
                  : 'start-0.5'
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
