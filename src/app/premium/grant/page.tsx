'use client';

import { useState } from 'react';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

const INSTITUTION_TYPES = [
  { value: 'school', label: 'مدرسة' },
  { value: 'training_center', label: 'مركز تدريب' },
  { value: 'charity', label: 'جمعية خيرية' },
  { value: 'other', label: 'أخرى' },
];

export default function GrantRequestPage() {
  const [form, setForm] = useState({
    institutionName: '',
    institutionType: '',
    institutionTypeOther: '',
    studentCount: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.institutionName.trim()) { setError('اسم المؤسسة مطلوب'); return; }
    if (!form.institutionType) { setError('نوع المؤسسة مطلوب'); return; }
    if (form.institutionType === 'other' && !form.institutionTypeOther.trim()) { setError('حدد نوع المؤسسة'); return; }
    if (!form.studentCount || Number(form.studentCount) < 1) { setError('عدد الطلاب مطلوب'); return; }
    if (!form.contactName.trim()) { setError('اسم المسؤول مطلوب'); return; }
    if (!form.contactPhone.trim()) { setError('رقم الجوال مطلوب'); return; }
    if (!form.contactEmail.trim() || !form.contactEmail.includes('@')) { setError('البريد الإلكتروني مطلوب'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/premium/grant-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionName: form.institutionName.trim(),
          institutionType: form.institutionType,
          institutionTypeOther: form.institutionType === 'other' ? form.institutionTypeOther.trim() : undefined,
          studentCount: Number(form.studentCount),
          contactName: form.contactName.trim(),
          contactPhone: form.contactPhone.trim(),
          contactEmail: form.contactEmail.trim(),
          notes: form.notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'حدث خطأ، حاول مرة أخرى');
      } else {
        setRequestNumber(data.requestNumber);
        setSubmitted(true);
      }
    } catch {
      setError('تحقق من اتصالك بالإنترنت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Link href="/premium" className="text-gray-500 hover:text-gray-700 text-sm">
            خطط الاشتراك
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-10">
        {submitted ? (
          /* Success State */
          <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-emerald-600 text-3xl">&#x2713;</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">تم استلام طلبك بنجاح!</h1>
            <p className="text-gray-600 mb-4">سنراجع طلبك ونتواصل معك خلال 3 أيام عمل.</p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6">
              <p className="text-gray-500 text-sm">رقم الطلب</p>
              <p className="text-xl font-bold text-gray-900 font-mono">{requestNumber}</p>
            </div>
            <Link
              href="/"
              className="inline-block bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
            >
              الصفحة الرئيسية
            </Link>
          </div>
        ) : (
          /* Form */
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">طلب منحة تعليمية</h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                نؤمن بأن كل طفل يستحقّ فرصة التعلّم. إذا كنت مؤسسة تعليمية أو جمعية خيرية، يمكنك التقدّم بطلب منحة لطلابك.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              {/* بيانات المؤسسة */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 mb-3 border-b border-gray-100 pb-2">بيانات المؤسسة</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم المؤسسة *</label>
                    <input
                      type="text"
                      value={form.institutionName}
                      onChange={e => handleChange('institutionName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نوع المؤسسة *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {INSTITUTION_TYPES.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleChange('institutionType', type.value)}
                          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                            form.institutionType === type.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                    {form.institutionType === 'other' && (
                      <input
                        type="text"
                        value={form.institutionTypeOther}
                        onChange={e => handleChange('institutionTypeOther', e.target.value)}
                        placeholder="حدد نوع المؤسسة"
                        className="w-full mt-2 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">عدد الطلاب المستهدفين *</label>
                    <input
                      type="number"
                      min="1"
                      value={form.studentCount}
                      onChange={e => handleChange('studentCount', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* بيانات التواصل */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 mb-3 border-b border-gray-100 pb-2">بيانات التواصل</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم المسؤول *</label>
                    <input
                      type="text"
                      value={form.contactName}
                      onChange={e => handleChange('contactName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال *</label>
                    <input
                      type="tel"
                      value={form.contactPhone}
                      onChange={e => handleChange('contactPhone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني *</label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={e => handleChange('contactEmail', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* ملاحظات */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 mb-3 border-b border-gray-100 pb-2">ملاحظات إضافية</h3>
                <textarea
                  value={form.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="أي معلومات إضافية تودون مشاركتها..."
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm text-center border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
