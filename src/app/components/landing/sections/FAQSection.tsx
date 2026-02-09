'use client';

import { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { FAQ_ITEMS } from '../data/landingData';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-gray-50 py-24 lg:py-32">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title">자주 묻는 질문</h2>
          <p className="section-subtitle">insa365 도입 전 궁금하신 점을 확인해보세요</p>
        </div>

        <div className="mx-auto mt-16 max-w-3xl space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openIndex === index ? 'max-h-[500px]' : 'max-h-0'
                }`}
              >
                <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                  <p className="text-sm leading-relaxed text-gray-500">{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">찾으시는 답변이 없나요?</p>
          <a
            href="mailto:support@insa365.co.kr"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
          >
            <MessageCircle className="h-4 w-4" />
            고객 지원팀에 문의하기
          </a>
        </div>
      </div>
    </section>
  );
}
