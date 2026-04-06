'use client';

import { useState } from 'react';

interface Goal {
  id: number;
  goalType: string;
  targetValue: number;
  currentValue: number | null;
  status: string;
}

interface GoalSettingProps {
  childId: string;
  childName: string;
  currentAccuracy: number;
  goal: Goal | null;
  prediction: { weeks: number; reachable: boolean; message: string } | null;
  onGoalSet: (goal: Goal) => void;
}

const TARGET_OPTIONS = [70, 80, 90, 95];

export default function GoalSetting({ childId, childName, currentAccuracy, goal, prediction, onGoalSet }: GoalSettingProps) {
  const [saving, setSaving] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);

  const handleSetGoal = async (target: number) => {
    setSaving(true);
    try {
      const res = await fetch('/api/parent/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, goalType: 'accuracy', targetValue: target }),
      });
      if (res.ok) {
        const data = await res.json();
        onGoalSet(data.goal);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleAbandon = async () => {
    if (!goal) return;
    setSaving(true);
    try {
      await fetch('/api/parent/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: goal.id, status: 'abandoned' }),
      });
      onGoalSet({ ...goal, status: 'abandoned' });
    } catch { /* ignore */ }
    setSaving(false);
  };

  const activeGoal = goal && goal.status === 'active' ? goal : null;
  const progress = activeGoal
    ? Math.min(100, Math.round((currentAccuracy / activeGoal.targetValue) * 100))
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3">🎯 أهداف {childName}</h3>

      {activeGoal ? (
        <div>
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>الهدف: {activeGoal.targetValue}%</span>
              <span>الحالي: {currentAccuracy}%</span>
            </div>
            {/* Current progress */}
            <div className="w-full bg-gray-100 rounded-full h-3 mb-1 relative">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((currentAccuracy / 100) * 100))}%` }}
              />
              {/* Goal marker */}
              <div
                className="absolute top-0 h-3 w-0.5 bg-gray-800"
                style={{ left: `${activeGoal.targetValue}%` }}
              />
            </div>
            <div className="text-xs text-gray-400">{progress}% من الهدف</div>
          </div>

          {prediction && (
            <div className="bg-blue-50 rounded-xl p-3 mb-3">
              <p className="text-xs text-blue-700">📊 {prediction.message}</p>
            </div>
          )}

          <button
            onClick={handleAbandon}
            disabled={saving}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            إلغاء الهدف
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-3">حدّد هدفاً للدقة لـ{childName}:</p>
          <div className="flex gap-2 mb-2">
            {TARGET_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTarget(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  selectedTarget === t
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t}%
              </button>
            ))}
          </div>
          {selectedTarget && (
            <button
              onClick={() => handleSetGoal(selectedTarget)}
              disabled={saving}
              className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {saving ? '...' : '✅ حدّد الهدف'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
