import QuestionForm from '../_form';

export default function NewQuestionPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إضافة سؤال جديد</h1>
        <p className="text-gray-500 text-sm mt-0.5">أملأ الحقول أدناه لإضافة سؤال جديد</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <QuestionForm />
      </div>
    </div>
  );
}
