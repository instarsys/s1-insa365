'use client';

import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { COMPARISON_ITEMS } from '../data/landingData';

export default function ComparisonSection() {
  return (
    <section className="bg-gray-50 py-24 lg:py-32">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title">
            기존 방식 vs <span className="text-blue-600">insa365</span>
          </h2>
          <p className="section-subtitle">Excel과 수작업에서 벗어나 얼마나 효율적으로 바뀌는지 확인하세요</p>
        </div>

        {/* Desktop table */}
        <div className="mx-auto mt-16 hidden max-w-4xl md:block">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-50">
              <div className="p-4 text-center text-sm font-semibold text-gray-700">항목</div>
              <div className="border-l border-gray-200 p-4 text-center text-sm font-semibold text-red-600">기존 방식</div>
              <div className="border-l border-gray-200 p-4 text-center text-sm font-semibold text-blue-600">insa365</div>
            </div>
            {COMPARISON_ITEMS.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={`grid grid-cols-3 ${index !== COMPARISON_ITEMS.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex items-center p-4 text-sm font-medium text-gray-900">{item.category}</div>
                <div className="flex items-center gap-2 border-l border-gray-100 p-4">
                  <X className="h-4 w-4 flex-shrink-0 text-red-400" />
                  <span className="text-sm text-gray-600">{item.before}</span>
                </div>
                <div className="flex items-center gap-2 border-l border-gray-100 p-4">
                  <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">{item.after}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="mt-12 space-y-4 md:hidden">
          {COMPARISON_ITEMS.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="text-sm font-semibold text-gray-900">{item.category}</div>
              <div className="mt-3 flex items-start gap-2">
                <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                <span className="text-sm text-gray-500">{item.before}</span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">{item.after}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
