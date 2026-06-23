import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

export interface LightboxImage {
  src: string;
  alt?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export default function ImageLightbox({ images, initialIndex = 0, open, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setRotation(0);
      setIsAnimating(true);
    }
  }, [open, initialIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setScale(1);
      setRotation(0);
    }
    if (e.key === "ArrowRight" && currentIndex < images.length - 1) {
      setCurrentIndex(i => i + 1);
      setScale(1);
      setRotation(0);
    }
  }, [open, currentIndex, images.length, onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || images.length === 0) return null;

  const current = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const goTo = (idx: number) => {
    setCurrentIndex(idx);
    setScale(1);
    setRotation(0);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = current.src;
    link.download = current.alt || `image-${currentIndex + 1}`;
    link.click();
  };

  return (
    <div
      className={`lightbox-overlay ${isAnimating ? "lightbox-fade-in" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onAnimationEnd={() => setIsAnimating(false)}
    >
      {/* Top toolbar */}
      <div className="lightbox-toolbar">
        <div className="lightbox-toolbar-left">
          {images.length > 1 && (
            <span className="lightbox-counter">
              {currentIndex + 1} / {images.length}
            </span>
          )}
          {current.alt && (
            <span className="lightbox-filename" title={current.alt}>
              {current.alt}
            </span>
          )}
        </div>
        <div className="lightbox-toolbar-right">
          <button
            type="button"
            onClick={() => setScale(s => Math.min(3, s + 0.25))}
            className="lightbox-btn"
            title="Perbesar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setScale(s => Math.max(0.25, s - 0.25))}
            className="lightbox-btn"
            title="Perkecil"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setRotation(r => r + 90)}
            className="lightbox-btn"
            title="Putar"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="lightbox-btn"
            title="Unduh"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="lightbox-btn lightbox-btn-close"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {hasPrev && (
        <button
          type="button"
          className="lightbox-nav lightbox-nav-prev"
          onClick={() => goTo(currentIndex - 1)}
          title="Sebelumnya (←)"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          className="lightbox-nav lightbox-nav-next"
          onClick={() => goTo(currentIndex + 1)}
          title="Selanjutnya (→)"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      )}

      {/* Main image */}
      <div className="lightbox-image-container">
        <img
          src={current.src}
          alt={current.alt || "Gambar"}
          className="lightbox-image"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
          draggable={false}
        />
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="lightbox-thumbstrip">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              className={`lightbox-thumb ${i === currentIndex ? "lightbox-thumb-active" : ""}`}
              onClick={() => goTo(i)}
            >
              <img
                src={img.src}
                alt={img.alt || `Thumbnail ${i + 1}`}
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
