import { useState, useEffect, useRef, ImgHTMLAttributes } from "react";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
}

/**
 * Lazy loading image component that only loads images when they're in viewport
 */
export default function LazyImage({ 
  src, 
  alt, 
  placeholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E",
  className = "",
  ...props 
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let observer: IntersectionObserver;
    const img = imgRef.current;

    if (img) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.disconnect();
            }
          });
        },
        {
          rootMargin: "50px", // Start loading 50px before image enters viewport
        }
      );

      observer.observe(img);
    }

    return () => {
      if (observer && img) {
        observer.unobserve(img);
      }
    };
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${!isLoaded ? "opacity-0 transition-opacity duration-300" : "opacity-100"}`}
      onLoad={() => setIsLoaded(true)}
      loading="lazy"
      {...props}
    />
  );
}
