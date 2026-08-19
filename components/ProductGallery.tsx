"use client";

import Image from "next/image";
import { useState } from "react";

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export default function ProductGallery({ images, title }: ProductGalleryProps) {
  const [activeImage, setActiveImage] = useState(images[0] || "");

  return (
    <div className="flex flex-col gap-4">
      {/* Основное изображение */}
      <div className="relative aspect-square bg-white rounded-2xl border border-gray-100 p-4">
        <img
          src={activeImage}
          alt={title}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Миниатюры */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setActiveImage(img)}
              className={`relative w-16 h-16 flex-shrink-0 rounded-xl border-2 overflow-hidden transition-all ${
                activeImage === img
                  ? "border-[#7000FF]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Image
                src={img}
                alt={`${title} - фото ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
