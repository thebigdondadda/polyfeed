import { useState } from "react";

export function LogoMark({
  className = "h-6 w-5",
  cover = false,
}: {
  className?: string;
  cover?: boolean;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox={cover ? "0 4 40 40" : "0 0 40 48"}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        clipRule="evenodd"
        d="m20 44c11.0457 0 20-8.9543 20-20s-8.9543-20-20-20c-11.04572 0-20 8.9543-20 20s8.95428 20 20 20zm6.2393-30.6832c.3037-1.0787-.7432-1.7167-1.6993-1.0355l-13.3469 9.5083c-1.0369.7387-.8738 2.2104.245 2.2104h3.5146v-.0272h6.8498l-5.5813 1.9693-2.4605 8.7411c-.3037 1.0788.7431 1.7167 1.6993 1.0355l13.3469-9.5082c1.0369-.7387.8737-2.2105-.245-2.2105h-5.3298z"
        fill="#fff"
        fillRule="evenodd"
      />
    </svg>
  );
}

const thumbClass = "size-10 shrink-0 rounded-lg bg-bg-secondary object-cover ring ring-bg-tertiary";

export function Thumb({ src }: { src?: string | null }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt="" className={thumbClass} onError={() => setFailed(true)} />;
  }
  return (
    <span className={`overflow-hidden ${thumbClass}`}>
      <LogoMark cover className="size-full" />
    </span>
  );
}

type LogoProps = {
  className?: string;
  wordmark?: boolean;
  href?: string;
  large?: boolean;
};

export function Logo({ className = "", wordmark = false, href, large = false }: LogoProps) {
  const mark = (
    <span className={`inline-flex items-center ${large ? "gap-4" : "gap-3"} ${className}`}>
      <svg
        fill="none"
        height={large ? 48 : 32}
        viewBox="0 0 40 48"
        width={large ? 40 : 27}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          clipRule="evenodd"
          d="m20 44c11.0457 0 20-8.9543 20-20s-8.9543-20-20-20c-11.04572 0-20 8.9543-20 20s8.95428 20 20 20zm6.2393-30.6832c.3037-1.0787-.7432-1.7167-1.6993-1.0355l-13.3469 9.5083c-1.0369.7387-.8738 2.2104.245 2.2104h3.5146v-.0272h6.8498l-5.5813 1.9693-2.4605 8.7411c-.3037 1.0788.7431 1.7167 1.6993 1.0355l13.3469-9.5082c1.0369-.7387.8737-2.2105-.245-2.2105h-5.3298z"
          fill="#fff"
          fillRule="evenodd"
        />
      </svg>
      {wordmark ? <span className={large ? "text-3xl" : "text-xl"}>Polyfeed</span> : null}
    </span>
  );

  if (href) {
    return (
      <a href={href} className="w-fit">
        {mark}
      </a>
    );
  }

  return mark;
}
