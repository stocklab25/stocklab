import React from 'react';
import Image from 'next/image';

export interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: number;
}

export default function Avatar({ src, alt, initials, size = 40 }: AvatarProps) {
  return src ? (
    <Image
      src={src}
      alt={alt || 'Avatar'}
      width={size}
      height={size}
      className="rounded-full object-cover border border-border"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold border border-border"
      style={{ width: size, height: size }}
    >
      {initials || '?'}
    </div>
  );
} 