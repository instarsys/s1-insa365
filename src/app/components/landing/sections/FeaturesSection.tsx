'use client';

import { motion } from 'framer-motion';
import { Calculator, MapPin, FileSpreadsheet, Mail, CalendarDays, FileText } from 'lucide-react';
import { FEATURES } from '../data/landingData';

const iconMap: Record<string, React.ElementType> = {
  Calculator, MapPin, FileSpreadsheet, Mail, CalendarDays, FileText,
};

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-24 lg:py-32">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title">
            HR 업무의 모든 것,
            <br />
            <span className="text-blue-600">하나의 플랫폼에서</span>
          </h2>
          <p className="section-subtitle">복잡한 인사 업무를 자동화하고, 매달 수십 시간을 절약하세요</p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = iconMap[feature.iconName];
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  {Icon && <Icon className="h-6 w-6 text-blue-600" />}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{feature.description}</p>
                {feature.highlight && (
                  <p className="mt-3 text-sm font-medium text-blue-600">{feature.highlight}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
