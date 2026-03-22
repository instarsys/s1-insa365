'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Trash2 } from 'lucide-react';

interface ImageUploadProps {
  imageUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  shape?: 'circle' | 'square';
  size?: number;
  label?: string;
  accept?: string;
  disabled?: boolean;
}

export function ImageUpload({
  imageUrl,
  onUpload,
  onDelete,
  shape = 'circle',
  size = 96,
  label,
  accept = 'image/*',
  disabled = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const rounded = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="text-xs font-medium text-gray-500">{label}</span>}
      <div className="group relative" style={{ width: size, height: size }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={label || '이미지'}
            width={size}
            height={size}
            className={`${rounded} object-cover border border-gray-200`}
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className={`${rounded} flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400`}
            style={{ width: size, height: size }}
          >
            <Camera className="h-6 w-6" />
          </div>
        )}

        {!disabled && (
          <div
            className={`${rounded} absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100`}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-white/90 p-1.5 text-gray-700 hover:bg-white"
              disabled={uploading}
            >
              <Camera className="h-4 w-4" />
            </button>
            {imageUrl && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-full bg-white/90 p-1.5 text-red-600 hover:bg-white"
                disabled={uploading}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {uploading && (
          <div
            className={`${rounded} absolute inset-0 flex items-center justify-center bg-black/50`}
          >
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
