import type { SVGProps } from 'react';

export function PatreonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor" // Patreon logo is usually solid
      {...props}
    >
      <path d="M16.5 2.25c-2.9 0-5.25 2.35-5.25 5.25s2.35 5.25 5.25 5.25 5.25-2.35 5.25-5.25S19.4 2.25 16.5 2.25zM2.25 21.75h3V7.5h-3v14.25z" />
    </svg>
  );
}
