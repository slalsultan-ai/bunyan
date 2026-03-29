'use client';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  age: number;
  ageGroup: string;
}

interface ChildCardProps {
  child: Child;
  onDelete: (id: string) => void;
  onEdit: (child: Child) => void;
}

const AGE_GROUP_LABEL: Record<string, string> = {
  '4-5': '٤-٥ سنوات',
  '6-9': '٦-٩ سنوات',
  '10-12': '١٠-١٢ سنة',
};

const CHILD_AVATAR = ['👦', '👧', '🧒'];

export default function ChildCard({ child, onDelete, onEdit }: ChildCardProps) {
  const avatar = CHILD_AVATAR[(child.name.charCodeAt(0) || 0) % CHILD_AVATAR.length];

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl">
            {avatar}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{child.name}</h3>
            <p className="text-sm text-gray-500">{child.age} سنوات • {AGE_GROUP_LABEL[child.ageGroup] || child.ageGroup}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(child)}
            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors text-sm"
            title="تعديل"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(child.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm"
            title="حذف"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/practice?age=${child.ageGroup}`}
          className="flex-1 bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-xl text-center hover:bg-emerald-700 transition-colors"
        >
          ابدأ جلسة
        </Link>
        <Link
          href="/progress"
          className="flex-1 bg-gray-100 text-gray-700 text-sm font-semibold py-2.5 rounded-xl text-center hover:bg-gray-200 transition-colors"
        >
          التقدم
        </Link>
      </div>
    </div>
  );
}
