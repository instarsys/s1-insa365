'use client';

import { motion } from 'framer-motion';
import { UserPlus, Building2, Users, Rocket } from 'lucide-react';
import { HOW_IT_WORKS } from '../data/landingData';

const iconMap: Record<string, React.ElementType> = { UserPlus, Building2, Users, Rocket };

export default function HowItWorksSection() {
  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title">
            <span className="text-blue-600">4단계</span>로 시작하세요
          </h2>
          <p className="section-subtitle">복잡한 설정 없이, 30분이면 모든 준비가 끝납니다</p>
        </div>

        <div className="relative mt-16">
          {/* Desktop connector line */}
          <div className="absolute left-0 right-0 top-12 hidden h-px bg-gray-200 lg:block" />

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step) => {
              const Icon = iconMap[step.iconName];
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: step.step * 0.1 }}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="relative z-10 mb-5 flex h-24 w-24 flex-col items-center justify-center rounded-2xl bg-gray-50">
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {step.step}
                    </span>
                    {Icon && <Icon className="h-8 w-8 text-gray-700" />}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
