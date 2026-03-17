'use client';

import { AlertTriangle } from 'lucide-react';

interface GpsWarningModalProps {
  open: boolean;
  locationName?: string;
  distance?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GpsWarningModal({ open, locationName, distance, onConfirm, onCancel }: GpsWarningModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">근무지 반경 밖</h3>
        </div>
        <p className="mb-6 text-sm text-gray-600">
          {locationName
            ? `현재 위치가 ${locationName}에서 ${distance ?? 0}m 떨어져 있습니다.`
            : '현재 위치가 근무지 반경 밖입니다.'}
          <br />
          <span className="text-gray-500">그래도 출퇴근 처리하시겠습니까?</span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
