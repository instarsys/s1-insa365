import Image from 'next/image';
import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
};

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

function Avatar({ name, imageUrl, size = 'md', className }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={sizeMap[size]}
        height={sizeMap[size]}
        className={cn(
          'rounded-full object-cover',
          sizeStyles[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-indigo-100 font-medium text-indigo-700',
        sizeStyles[size],
        className,
      )}
      title={name}
    >
      {initial}
    </div>
  );
}

export { Avatar, type AvatarProps, type AvatarSize };
