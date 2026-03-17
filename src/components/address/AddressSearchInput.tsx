'use client';

import { useState, useCallback } from 'react';
import DaumPostcodeEmbed, { type Address } from 'react-daum-postcode';
import { Search, X } from 'lucide-react';

interface AddressSearchInputProps {
  value: string;
  onChange: (address: string) => void;
  onAddressSelected?: (result: { address: string; zonecode: string }) => void;
  label?: string;
  placeholder?: string;
}

export function AddressSearchInput({
  value,
  onChange,
  onAddressSelected,
  label,
  placeholder = '주소를 검색하세요',
}: AddressSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleComplete = useCallback(
    (data: Address) => {
      const fullAddress = data.roadAddress || data.jibunAddress;
      onChange(fullAddress);
      onAddressSelected?.({ address: fullAddress, zonecode: data.zonecode });
      setIsOpen(false);
    },
    [onChange, onAddressSelected],
  );

  return (
    <div>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          placeholder={placeholder}
          readOnly
        />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Search className="h-4 w-4" />
          주소 검색
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-800">주소 검색</h4>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DaumPostcodeEmbed
              onComplete={handleComplete}
              style={{ height: 470 }}
              autoClose={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
