'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Shield } from 'lucide-react';
import { CUSTOMER_STATS } from '../data/landingData';

const iconMap: Record<string, React.ElementType> = { Zap, TrendingUp, Shield };

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: 'easeOut' as const },
  }),
};

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-24 lg:py-32">
      <div className="container-custom">
        {/* Text content */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.h1
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeIn}
            className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
          >
            엑셀 급여 계산,
            <br />
            <span className="text-blue-600">이제 그만</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            custom={0.1}
            variants={fadeIn}
            className="mt-6 text-lg text-gray-500 sm:text-xl"
          >
            출퇴근 데이터로 연장/지각/조퇴까지 자동 계산.
            <br className="hidden sm:block" />
            4대보험, 소득세, 급여대장까지 한 번에.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={0.2}
            variants={fadeIn}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link
              href="/signup"
              className="w-full rounded-xl bg-blue-600 px-8 py-4 text-center text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto"
            >
              21일 무료 체험 시작
            </Link>
            <Link
              href="#screenshots"
              className="w-full rounded-xl border border-gray-300 bg-white px-8 py-4 text-center text-lg font-semibold text-gray-700 transition-colors hover:border-gray-400 sm:w-auto"
            >
              제품 둘러보기
            </Link>
          </motion.div>
        </div>

        {/* Screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mx-auto mt-16 max-w-5xl"
        >
          <img
            src="/screenshots/dashboard.png"
            alt="insa365 대시보드"
            className="w-full rounded-2xl border border-gray-200 shadow-2xl"
          />
        </motion.div>

        {/* 3 Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-8"
        >
          {CUSTOMER_STATS.map((stat) => {
            const Icon = iconMap[stat.iconName];
            return (
              <div key={stat.label} className="text-center">
                {Icon && <Icon className="mx-auto h-6 w-6 text-blue-600" />}
                <div className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{stat.value}</div>
                <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
