'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { label: '주요 기능', id: 'features' },
    { label: '요금제', id: 'pricing' },
    { label: 'FAQ', id: 'faq' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="container-custom">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              I3
            </div>
            <span className="text-xl font-bold text-gray-900">insa365</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-blue-600"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA + Mobile hamburger */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-blue-600 sm:block"
            >
              로그인
            </Link>
            <Link href="/signup" className="hidden btn-primary text-sm sm:inline-flex">
              무료 체험 시작
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
              aria-label="메뉴 열기"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white md:hidden">
          <div className="container-custom space-y-1 py-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="block w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {item.label}
              </button>
            ))}
            <div className="border-t border-gray-100 pt-3">
              <Link
                href="/login"
                className="block w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="mt-2 block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                무료 체험 시작
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
