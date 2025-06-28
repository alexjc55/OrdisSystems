import React, { useState, useEffect } from 'react';

interface AdaptiveBannerProps {
  src: string;
  alt: string;
  link?: string;
  className?: string;
  containerClassName?: string;
}

export function AdaptiveBanner({ 
  src, 
  alt, 
  link, 
  className = "", 
  containerClassName = "" 
}: AdaptiveBannerProps) {
  const [aspectRatio, setAspectRatio] = useState<string>("16/9");
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      
      // Определяем подходящее соотношение сторон на основе реального изображения
      if (ratio >= 2.5) {
        setAspectRatio("21/9"); // Очень широкий баннер
      } else if (ratio >= 2.0) {
        setAspectRatio("2/1"); // Широкий баннер
      } else if (ratio >= 1.6) {
        setAspectRatio("16/10"); // Стандартный широкий
      } else if (ratio >= 1.4) {
        setAspectRatio("3/2"); // Классический фото формат
      } else if (ratio >= 1.2) {
        setAspectRatio("4/3"); // Более квадратный
      } else if (ratio >= 0.9) {
        setAspectRatio("1/1"); // Квадратный
      } else {
        setAspectRatio("3/4"); // Портретный
      }
      
      setImageLoaded(true);
    };
    
    img.src = src;
  }, [src]);

  const content = (
    <div 
      className={`relative overflow-hidden rounded-lg shadow-lg group transition-all duration-300 ${containerClassName}`}
      style={{ aspectRatio: imageLoaded ? aspectRatio : "16/9" }}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-contain bg-gradient-to-br from-gray-50 to-gray-100 transition-transform duration-300 group-hover:scale-[1.02] ${className}`}
        loading="lazy"
        onLoad={() => setImageLoaded(true)}
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-300"></div>
      
      {/* Загрузочная анимация */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );

  if (link) {
    return (
      <a 
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block transform transition-transform duration-200 hover:scale-[0.98]"
      >
        {content}
      </a>
    );
  }

  return content;
}