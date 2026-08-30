import Image from "next/image";

/**
 * Картинка товара. next/image оставлен «as is» для локальных файлов,
 * внешние URL (загруженные продавцом) идут без оптимизатора, чтобы
 * картинка не depended на доступность внешнего хостинга.
 */
interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  fill?: boolean;
  priority?: boolean;
}

const PLACEHOLDER = "/products/placeholder.svg";

export default function ProductImage({
  src,
  alt,
  className = "",
  sizes = "(max-width: 768px) 50vw, 25vw",
  fill = true,
  priority = false,
}: ProductImageProps) {
  const safeSrc = src || PLACEHOLDER;

  if (fill) {
    return (
      <Image
        src={safeSrc}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized
        loading={priority ? undefined : "lazy"}
        className={`object-contain ${className}`}
        onError={(event) => {
          const img = event.currentTarget as HTMLImageElement;
          if (img.src !== PLACEHOLDER && !img.src.endsWith(PLACEHOLDER)) {
            img.src = PLACEHOLDER;
          }
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={safeSrc}
      alt={alt}
      loading="lazy"
      className={`object-contain ${className}`}
      onError={(event) => {
        const img = event.currentTarget as HTMLImageElement;
        if (!img.src.endsWith(PLACEHOLDER)) img.src = PLACEHOLDER;
      }}
    />
  );
}

export { PLACEHOLDER };
