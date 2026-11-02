import clsx from "clsx";
import Image from "next/image";

type AvatarProps = {
  name: string;
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");
}

export function Avatar({ name, src, alt, size = 40, className }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt ?? name}
        width={size}
        height={size}
        className={clsx("rounded-pill object-cover", className)}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      style={{ width: size, height: size }}
      className={clsx(
        "inline-flex items-center justify-center rounded-pill bg-graphite text-meta font-semibold text-white",
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
