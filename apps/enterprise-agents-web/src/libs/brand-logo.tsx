export interface BrandLogoProps {
  sizePixels?: number;
  className?: string;
}

export function BrandLogo({ sizePixels = 28, className = '' }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={sizePixels}
      height={sizePixels}
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <rect
        x="0"
        y="0"
        width="512"
        height="512"
        rx="92"
        className="fill-neutral-950 dark:fill-neutral-50"
      />
      <polygon
        points="205,146 325,146 236,249 114,249"
        className="fill-white dark:fill-neutral-950"
      />
      <polygon
        points="250,261 376,261 270,395 143,395"
        className="fill-white dark:fill-neutral-950"
      />
      <path
        d="M 380 106 Q 387 144 425 151 Q 387 158 380 196 Q 373 158 335 151 Q 373 144 380 106 Z"
        className="fill-white dark:fill-neutral-950"
      />
    </svg>
  );
}
