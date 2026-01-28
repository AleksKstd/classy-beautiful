"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, ArrowUp, ArrowDown, Loader2, ImageOff } from "lucide-react";
import {
  uploadCarouselImage,
  deleteCarouselImage,
  updateCarouselImageOrder,
  deleteStaleCarouselEntry,
} from "@/app/actions/admin";

interface CarouselImage {
  id: string;
  storage_path: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface CarouselManagerProps {
  images: CarouselImage[];
}

export function CarouselManager({ images: initialImages }: CarouselManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = (imageId: string) => {
    setFailedImages(prev => new Set(prev).add(imageId));
  };

  // Filter out images that failed to load
  const validImages = initialImages.filter(img => !failedImages.has(img.id));
  
  // Get failed images data for cleanup
  const failedImagesList = initialImages.filter(img => failedImages.has(img.id));

  const handleCleanupStaleEntries = async () => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете ${failedImages.size} невалидни записа?`)) {
      return;
    }
    
    setCleaningUp(true);
    
    for (const img of failedImagesList) {
      await deleteStaleCarouselEntry(img.id);
    }
    
    setCleaningUp(false);
    window.location.reload();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Моля изберете изображение");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadCarouselImage(formData);

    setUploading(false);

    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error || "Грешка при качване");
    }

    e.target.value = "";
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (!confirm("Сигурни ли сте, че искате да изтриете тази снимка?")) {
      return;
    }

    const result = await deleteCarouselImage(id, storagePath);
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error || "Грешка при изтриване");
    }
  };

  const handleMoveUp = async (image: CarouselImage) => {
    const currentIndex = initialImages.findIndex((img) => img.id === image.id);
    if (currentIndex <= 0) return;

    const prevImage = initialImages[currentIndex - 1];
    
    await Promise.all([
      updateCarouselImageOrder(image.id, prevImage.display_order),
      updateCarouselImageOrder(prevImage.id, image.display_order),
    ]);

    window.location.reload();
  };

  const handleMoveDown = async (image: CarouselImage) => {
    const currentIndex = initialImages.findIndex((img) => img.id === image.id);
    if (currentIndex >= initialImages.length - 1) return;

    const nextImage = initialImages[currentIndex + 1];
    
    await Promise.all([
      updateCarouselImageOrder(image.id, nextImage.display_order),
      updateCarouselImageOrder(nextImage.id, image.display_order),
    ]);

    window.location.reload();
  };

  const getImageUrl = (storagePath: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Handle legacy paths that already include "carousel/" prefix
    const cleanPath = storagePath.startsWith("carousel/") 
      ? storagePath.replace("carousel/", "") 
      : storagePath;
    return `${supabaseUrl}/storage/v1/object/public/carousel/${cleanPath}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Управление на снимки</h2>
        <div>
          <input
            type="file"
            id="upload-image"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          <Button asChild disabled={uploading} className="w-full sm:w-auto">
            <label htmlFor="upload-image" className="cursor-pointer flex items-center justify-center">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Качване...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Качи снимка
                </>
              )}
            </label>
          </Button>
        </div>
      </div>

      {/* Show warning if some images failed to load */}
      {failedImages.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ImageOff className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              <strong>{failedImages.size} снимки</strong> не могат да бъдат заредени (липсват в хранилището).
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCleanupStaleEntries}
            disabled={cleaningUp}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            {cleaningUp ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Изчистване...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Изчисти записите
              </>
            )}
          </Button>
        </div>
      )}

      {validImages.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <p className="text-gray-500">Няма качени снимки</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {validImages.map((image, index) => (
            <div
              key={image.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200"
            >
              <div className="aspect-video relative bg-gray-100">
                <img
                  src={getImageUrl(image.storage_path)}
                  alt={`Снимка ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(image.id)}
                />
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  #{image.display_order + 1}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMoveUp(image)}
                      disabled={index === 0}
                      title="Премести нагоре"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMoveDown(image)}
                      disabled={index === validImages.length - 1}
                      title="Премести надолу"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(image.id, image.storage_path)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Забележка:</strong> Снимките се показват в каруселата по реда, в който са подредени тук.
          Използвайте стрелките нагоре/надолу за промяна на реда.
        </p>
      </div>
    </div>
  );
}
