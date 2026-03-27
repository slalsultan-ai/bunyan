'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QuestionForm from '../_form';

export default function EditQuestionPage() {
  const { id } = useParams<{ id: string }>();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/questions/${id}`).then(r => r.json()).then(d => {
      setQuestion(d.question);
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!question) return <div className="p-6 text-red-600">السؤال غير موجود</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">تعديل السؤال</h1>
        <p className="text-gray-400 text-xs mt-1 font-mono">{id}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <QuestionForm initial={question} id={id} />
      </div>
    </div>
  );
}
