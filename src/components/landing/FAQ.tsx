'use client';
import { useState } from 'react';
import type { FaqItem } from '@/lib/content';

export default function FAQ({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">أسئلة شائعة</h2>
        </div>
        <div className="space-y-3">
          {items.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-right flex items-center justify-between p-5 font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <span className="flex-1">{faq.q}</span>
                <span className={`text-emerald-500 text-xl transition-transform duration-200 flex-shrink-0 ms-3 ${open === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3 animate-fade-in-up">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
