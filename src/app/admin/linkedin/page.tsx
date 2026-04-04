'use client';
import { useState, useEffect, useCallback } from 'react';

interface LinkedInPost {
  id: number;
  type: string;
  typeLabel: string;
  content: string;
  comment?: string | null;
  questionId?: string | null;
  copied: boolean;
  generatedForDate: string;
  createdAt: string;
}

export default function LinkedInPage() {
  const [todayPosts, setTodayPosts] = useState<LinkedInPost[]>([]);
  const [history, setHistory] = useState<LinkedInPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/linkedin');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTodayPosts(data.todayPosts);
      setHistory(data.history);
    } catch {
      setToast('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = async (post: LinkedInPost, withEmoji = true) => {
    let text = post.content;
    if (!withEmoji) {
      text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{200D}\u{FE0F}\u{E0020}-\u{E007F}✅❓⚠️💡📊📚🗣️📖✍️🔤📝🧩🔍🏗️🔗🎭🧠📐🧮🎯💬👨‍👩‍👧‍👦🌱🌟🎲🧱♟️🔢🎯]/gu, '').replace(/  +/g, ' ').trim();
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(post.id);
      showToast('تم النسخ ✅');

      // Mark as copied in DB
      await fetch('/api/admin/linkedin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, copied: true }),
      });

      // Update local state
      setTodayPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, copied: true } : p)));
      setHistory((prev) => prev.map((p) => (p.id === post.id ? { ...p, copied: true } : p)));
    } catch {
      showToast('فشل النسخ — جرّب يدوياً');
    }
  };

  const copyComment = async (post: LinkedInPost) => {
    if (!post.comment) return;
    try {
      await navigator.clipboard.writeText(post.comment);
      showToast('تم نسخ التعليق ✅');
    } catch {
      showToast('فشل النسخ');
    }
  };

  const regenerate = async (type: string) => {
    setRegenerating(true);
    try {
      const res = await fetch('/api/admin/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate', type }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTodayPosts((prev) => [data.post, ...prev]);
      showToast('تم توليد بوست جديد');
    } catch {
      showToast('حدث خطأ في التوليد');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 text-lg">جارٍ التحميل...</div>
      </div>
    );
  }

  const postType = todayPosts[0]?.type || '';
  const postTypeLabel = todayPosts[0]?.typeLabel || '';

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">📝 محتوى لينكدإن — بوست اليوم</h1>
          <p className="text-sm text-gray-500 mt-1">
            النوع: <span className="font-medium text-gray-700">{postTypeLabel}</span>
          </p>
        </div>
        <button
          onClick={() => regenerate(postType)}
          disabled={regenerating}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {regenerating ? (
            <>
              <span className="animate-spin">⏳</span>
              جارٍ التوليد...
            </>
          ) : (
            <>🔄 توليد جديد</>
          )}
        </button>
      </div>

      {/* Today's Posts */}
      <div className="space-y-6">
        {todayPosts.map((post, idx) => (
          <PostCard
            key={post.id}
            post={post}
            index={idx}
            total={todayPosts.length}
            copiedId={copiedId}
            onCopy={copyToClipboard}
            onCopyComment={copyComment}
          />
        ))}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">سجل المنشورات السابقة</h2>
          <div className="space-y-2">
            {history.map((post) => (
              <HistoryRow key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  index,
  total,
  copiedId,
  onCopy,
  onCopyComment,
}: {
  post: LinkedInPost;
  index: number;
  total: number;
  copiedId: number | null;
  onCopy: (post: LinkedInPost, withEmoji?: boolean) => void;
  onCopyComment: (post: LinkedInPost) => void;
}) {
  const label = index === 0 && total > 1 ? 'البوست الأول' : index === 1 ? 'البوست الثاني' : `بوست #${index + 1}`;
  const isCopied = copiedId === post.id || post.copied;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {total > 1 && (
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 text-xs font-medium text-gray-500">
          {label}
        </div>
      )}

      {/* Content */}
      <div className="p-4 md:p-5">
        <pre className="whitespace-pre-wrap font-sans text-sm md:text-base leading-relaxed text-gray-800 bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-[500px] overflow-y-auto" dir="rtl">
          {post.content}
        </pre>
      </div>

      {/* Actions */}
      <div className="px-4 md:px-5 pb-4 flex flex-wrap gap-2">
        <button
          onClick={() => onCopy(post, true)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            isCopied
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isCopied ? '✅ تم النسخ' : '📋 نسخ مع الإيموجي'}
        </button>
        <button
          onClick={() => onCopy(post, false)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          📋 نسخ بدون إيموجي
        </button>
        {post.comment && (
          <button
            onClick={() => onCopyComment(post)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            💬 نسخ التعليق (الإجابة)
          </button>
        )}
      </div>

      {/* Comment preview for interactive questions */}
      {post.comment && (
        <div className="px-4 md:px-5 pb-4">
          <details className="group">
            <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
              عرض التعليق (الإجابة) ▾
            </summary>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 bg-amber-50 rounded-xl p-3 border border-amber-100" dir="rtl">
              {post.comment}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ post }: { post: LinkedInPost }) {
  const date = new Date(post.generatedForDate + 'T00:00:00');
  const dayName = date.toLocaleDateString('ar-SA', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' });
  const preview = post.content.split('\n').filter(Boolean).slice(0, 2).join(' — ').slice(0, 80);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors text-sm">
      <span className="text-lg">{post.copied ? '✅' : '⏳'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>📅 {dateStr} ({dayName})</span>
          <span className="text-gray-300">|</span>
          <span className="font-medium text-gray-600">{post.typeLabel}</span>
        </div>
        <p className="text-gray-700 truncate mt-0.5">{preview}...</p>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full ${post.copied ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
        {post.copied ? 'تم النسخ' : 'لم يُنسخ'}
      </span>
    </div>
  );
}
