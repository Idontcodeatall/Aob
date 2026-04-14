"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Camera, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type MediaUploaderProps = {
  onImageSelect: (dataUrl: string) => void;
  aspectHint?: string; // e.g. "4:5" — displayed to guide the user
};

export function MediaUploader({ onImageSelect, aspectHint }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) onImageSelect(result);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg mx-auto"
    >
      {/* Hidden native input — accepts images + camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drop Zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed
          transition-all duration-300 overflow-hidden
          flex flex-col items-center justify-center
          min-h-[320px] p-8 gap-4
          ${
            isDragging
              ? "border-brand-accent bg-brand-accent/10 shadow-[0_0_40px_rgba(128,0,0,0.15)]"
              : "border-neutral-700 bg-neutral-900/50 hover:border-neutral-500 hover:bg-neutral-900/80"
          }
        `}
      >
        {/* Animated icon */}
        <motion.div
          animate={isDragging ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`
            w-20 h-20 rounded-2xl flex items-center justify-center
            ${isDragging ? "bg-brand-accent/20" : "bg-neutral-800"}
            transition-colors duration-300
          `}
        >
          {isDragging ? (
            <Upload size={32} className="text-brand-accent" />
          ) : (
            <ImageIcon size={32} className="text-neutral-500" />
          )}
        </motion.div>

        {/* Text */}
        <div className="text-center">
          <p className="text-brand-text font-medium text-lg mb-1">
            {isDragging ? "Drop your image here" : "Upload an image"}
          </p>
          <p className="text-neutral-500 text-sm">
            Drag & drop or click to browse
          </p>
          {aspectHint && (
            <p className="text-neutral-600 text-xs mt-2">
              Recommended: {aspectHint} aspect ratio
            </p>
          )}
        </div>

        {/* Camera hint for mobile */}
        <div className="flex items-center gap-2 text-neutral-600 text-xs mt-2">
          <Camera size={14} />
          <span>Camera available on mobile</span>
        </div>

        {/* Decorative corner accents */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-brand-accent/30 rounded-tl-lg" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-brand-accent/30 rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-brand-accent/30 rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-brand-accent/30 rounded-br-lg" />
      </div>
    </motion.div>
  );
}
