import type { SVGProps } from 'react';

export function CelestialIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2l2.5 5.5L20 9l-4.5 4L17 18.5 12 16l-5 2.5L8.5 13 4 9l5.5-1.5L12 2z" />
      <path d="M12 2v20" />
      <path d="M2 12h20" />
      <path d="M5 5l14 14" />
      <path d="M5 19l14-14" />
    </svg>
  );
}
