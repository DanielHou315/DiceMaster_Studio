import React, { useState } from 'react';

interface HardwareImageProps {
  src: string;
  /** Original asset path (e.g. /assets/foo.jpg) used to validate the format. */
  path?: string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

/** Hardware accepts exactly these square resolutions. */
const VALID_SIZES: ReadonlyArray<readonly [number, number]> = [
  [480, 480],
  [240, 240],
];

/** Hardware accepts JPEG only (ContentTypeExts[IMAGE] = ['jpg','jpeg']). */
const VALID_EXTS = ['jpg', 'jpeg'];

/**
 * Renders an image only if it is something the real hardware could display:
 * a JPEG at exactly 480×480 or 240×240. Anything else shows a placeholder
 * mirroring hardware rejection. Valid images render with object-contain
 * (no crop), which for square images is identical to the physical screen.
 */
export const HardwareImage: React.FC<HardwareImageProps> = ({
  src,
  path,
  className,
  style,
  alt,
}) => {
  // null = not yet loaded/verified, string = reason for unsupported.
  const [dimReason, setDimReason] = useState<string | null>(null);

  // Format check (only when we know the original extension).
  let formatReason: string | null = null;
  if (path) {
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    if (!VALID_EXTS.includes(ext)) {
      formatReason = 'Hardware supports JPEG only';
    }
  }

  const reason = formatReason ?? dimReason;

  if (reason) {
    return (
      <div
        className={`${className ?? ''} flex flex-col items-center justify-center bg-zinc-900 text-center select-none pointer-events-none`}
        style={style}
      >
        <span className="text-base leading-none" aria-hidden>⚠</span>
        <span className="mt-1 px-1 text-[8px] leading-tight text-zinc-500">
          {reason}
        </span>
      </div>
    );
  }

  // Force object-contain (override any object-cover passed in className).
  const imgClassName = `${(className ?? '').replace(/\bobject-cover\b/g, '')} object-contain`.trim();

  return (
    <img
      src={src}
      alt={alt}
      className={imgClassName}
      style={style}
      referrerPolicy="no-referrer"
      draggable={false}
      onLoad={(e) => {
        const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
        const ok = VALID_SIZES.some(([vw, vh]) => w === vw && h === vh);
        setDimReason(ok ? null : `Must be 480×480 or 240×240 (got ${w}×${h})`);
      }}
      onError={() => setDimReason('Image failed to load')}
    />
  );
};
