interface LogoProps {
  width?: number
  height?: number
  className?: string
}

export function Logo({ width = 32, height = 32, className }: LogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 86 75"
      fill="none"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M11.251 59.385s-.693-15.968 4.246-24.97c4.938-9.003 21.044-21.136 21.044-21.136l10.352 10.306zm63.355-12.383s.693-15.968-4.245-24.97C65.423 13.029 49.316.896 49.316.896L38.965 11.203zm-1.217 28s.692-15.968-4.246-24.97c-4.938-9.003-21.044-21.136-21.044-21.136L37.747 39.203z"
        fill="currentColor"
      />
    </svg>
  )
}
