'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CTASection() {
  return (
    <section className="bg-blue-600 py-24 lg:py-32">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center text-white"
        >
          <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
            지금 바로
            <br />
            HR 자동화를 시작하세요
          </h2>
          <p className="mt-6 text-lg text-blue-100">
            매달 급여 업무에 16시간씩 쓰시나요?
            <br />
            insa365로 1시간이면 끝납니다.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="w-full rounded-xl bg-white px-8 py-4 text-center text-lg font-semibold text-blue-600 transition-colors hover:bg-blue-50 sm:w-auto"
            >
              21일 무료 체험 시작
            </Link>
            <a
              href="mailto:sales@insa365.co.kr?subject=insa365 도입 문의"
              className="w-full rounded-xl border border-white/30 px-8 py-4 text-center text-lg font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              도입 문의하기
            </a>
          </div>

          <p className="mt-6 text-sm text-blue-200">신용카드 등록 불필요 · 언제든 취소 가능</p>
        </motion.div>
      </div>
    </section>
  );
}
