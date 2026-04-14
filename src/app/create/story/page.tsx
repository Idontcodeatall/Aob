"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Type,
  Pencil,
  Plus,
  Minus,
  Check,
  Upload,
  ChevronLeft,
} from "lucide-react";
import { useReviews } from "@/lib/ReviewContext";
import { MediaUploader } from "@/components/MediaUploader";

type DrawLine = {
  points: { x: number; y: number }[];
  color: string;
  width: number;
};

type TextElement = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
};

type ToolMode = "select" | "text" | "draw" | null;

export default function StoryEditorPage() {
  const router = useRouter();
  const { addStory } = useReviews();
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Editor State
  const [tool, setTool] = useState<ToolMode>(null);
  const [brushSize, setBrushSize] = useState(6);
  const [drawColor, setDrawColor] = useState("#800000");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [lines, setLines] = useState<DrawLine[]>([]);
  const [currentLine, setCurrentLine] = useState<DrawLine | null>(null);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  // Text Input State
  const [showTextInput, setShowTextInput] = useState(false);
  const [newText, setNewText] = useState("");
  const [textClickPos, setTextClickPos] = useState({ x: 0, y: 0 });
  const textInputRef = useRef<HTMLInputElement>(null);

  // Dragging Text State
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 1. Load Image
  useEffect(() => {
    if (!imageDataUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBgImage(img);
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  // 2. Responsive Canvas Size (9:16)
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return;
    const containerH = containerRef.current.clientHeight;
    // 9:16 ratio
    const h = containerH;
    const w = (h * 9) / 16;
    setCanvasSize({ w: Math.floor(w), h: Math.floor(h) });
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [updateCanvasSize, imageDataUrl]);

  // 3. Draw Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImage || canvasSize.w === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

    // Draw Background (Cover fit)
    const imgRatio = bgImage.width / bgImage.height;
    const canvasRatio = canvasSize.w / canvasSize.h;
    let sx = 0, sy = 0, sw = bgImage.width, sh = bgImage.height;
    if (imgRatio > canvasRatio) {
      sw = bgImage.height * canvasRatio;
      sx = (bgImage.width - sw) / 2;
    } else {
      sh = bgImage.width / canvasRatio;
      sy = (bgImage.height - sh) / 2;
    }
    ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, canvasSize.w, canvasSize.h);

    // Draw Lines
    const allLines = currentLine ? [...lines, currentLine] : lines;
    allLines.forEach((line) => {
      if (line.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
    });

    // Draw Text
    textElements.forEach((te) => {
      ctx.font = `bold ${te.fontSize}px "Outfit", sans-serif`;
      ctx.fillStyle = te.color;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 6;
      ctx.fillText(te.text, te.x, te.y);
      ctx.shadowColor = "transparent";
    });
  }, [bgImage, lines, currentLine, textElements, canvasSize]);

  // 4. Input Handlers
  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasSize.w / rect.width;
    const scaleY = canvasSize.h / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, [canvasSize]);

  const findTextAt = (x: number, y: number): TextElement | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    for (let i = textElements.length - 1; i >= 0; i--) {
      const te = textElements[i];
      ctx.font = `bold ${te.fontSize}px "Outfit", sans-serif`;
      const metrics = ctx.measureText(te.text);
      if (x >= te.x && x <= te.x + metrics.width && y >= te.y - te.fontSize && y <= te.y) {
        return te;
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    if (tool === "draw") {
      setIsDrawing(true);
      setCurrentLine({ points: [pos], color: drawColor, width: brushSize });
    } else if (tool === "text") {
      setTextClickPos(pos);
      setShowTextInput(true);
      setTimeout(() => textInputRef.current?.focus(), 100);
    } else {
      const hit = findTextAt(pos.x, pos.y);
      if (hit) {
        setDraggingTextId(hit.id);
        setDragOffset({ x: pos.x - hit.x, y: pos.y - hit.y });
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing && !draggingTextId) return;
    const pos = getPos(e);
    if (isDrawing && currentLine) {
      setCurrentLine({ ...currentLine, points: [...currentLine.points, pos] });
    } else if (draggingTextId) {
      setTextElements(prev => prev.map(te => te.id === draggingTextId ? { ...te, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } : te));
    }
  };

  const handlePointerUp = () => {
    if (isDrawing && currentLine) {
      setLines(prev => [...prev, currentLine]);
      setCurrentLine(null);
    }
    setIsDrawing(false);
    setDraggingTextId(null);
  };

  const handleAddText = () => {
    if (newText.trim()) {
      setTextElements(prev => [...prev, {
        id: Math.random().toString(36),
        text: newText,
        x: textClickPos.x,
        y: textClickPos.y,
        fontSize: 32,
        color: textColor
      }]);
    }
    setNewText("");
    setShowTextInput(false);
    setTool("select");
  };

  const shareToStory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    addStory({
      id: Math.random().toString(36),
      imageUrl: dataUrl,
      timestamp: new Date().toISOString(),
      author: "Me",
    });
    router.push("/");
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col font-sans select-none">
      {/* --- Header Navigation --- */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-50 bg-gradient-to-b from-black/60 to-transparent">
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-full bg-neutral-900/50 text-white hover:bg-neutral-800 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTool("select")}
            className={`p-2.5 rounded-full transition-all ${tool === "select" ? "bg-white text-black scale-110 shadow-lg" : "bg-neutral-900/50 text-white hover:bg-neutral-800"}`}
          >
            <Check size={20} />
          </button>
          <div className="relative">
            <button 
              onClick={() => setTool("text")}
              className={`p-2.5 rounded-full transition-all ${tool === "text" ? "bg-brand-accent text-white scale-110 shadow-lg" : "bg-neutral-900/50 text-white hover:bg-neutral-800"}`}
            >
              <Type size={20} />
            </button>
            {tool === "text" && (
              <div className="absolute top-full mt-4 right-0 bg-neutral-900 rounded-2xl py-3 px-6 border border-neutral-700 shadow-2xl min-w-[160px] flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Text Color</span>
                <label className="relative w-8 h-8 rounded-full cursor-pointer ring-2 ring-neutral-600 hover:ring-neutral-400 transition-all overflow-hidden" style={{ backgroundColor: textColor }}>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>
              </div>
            )}
          </div>
          <div className="relative group">
            <button 
              onClick={() => setTool("draw")}
              className={`p-2.5 rounded-full transition-all ${tool === "draw" ? "bg-red-800 text-white scale-110 shadow-lg" : "bg-neutral-900/50 text-white hover:bg-neutral-800"}`}
            >
              <Pencil size={20} />
            </button>
            {tool === "draw" && (
              <div className="absolute top-full mt-4 right-0 bg-neutral-900 rounded-2xl py-3 px-6 border border-neutral-700 shadow-2xl min-w-[200px] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Brush Size</span>
                  <span className="text-xs font-mono text-brand-accent">{brushSize}px</span>
                </div>
                <div className="relative flex items-center group/slider">
                  <input
                    type="range"
                    min="2"
                    max="60"
                    step="2"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-brand-accent hover:accent-brand-accent/80 transition-all"
                  />
                  {/* Bubble Indicator */}
                  <motion.div 
                    layout
                    className="absolute -top-12 left-0 pointer-events-none"
                    style={{ left: `${((brushSize - 2) / 58) * 100}%`, x: "-50%" }}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="bg-brand-accent text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xl mb-1">
                        {brushSize}
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-brand-accent" />
                    </div>
                  </motion.div>
                </div>
                {/* Color Picker */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Color</span>
                  <label className="relative w-8 h-8 rounded-full cursor-pointer ring-2 ring-neutral-600 hover:ring-neutral-400 transition-all overflow-hidden" style={{ backgroundColor: drawColor }}>
                    <input
                      type="color"
                      value={drawColor}
                      onChange={(e) => setDrawColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Main Editor Area --- */}
      <div 
        ref={containerRef}
        className="flex-1 w-full flex items-center justify-center p-4"
      >
        {!imageDataUrl ? (
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Create a Story</h2>
              <p className="text-neutral-400">Add an image or photo to your daily book archive</p>
            </div>
            <MediaUploader 
              onImageSelect={setImageDataUrl} 
              aspectHint="9:16 Portrait"
            />
          </div>
        ) : (
          <div 
            className="relative shadow-2xl rounded-xl overflow-hidden bg-neutral-900 transition-all duration-500"
            style={{ width: canvasSize.w, height: canvasSize.h }}
          >
             {canvasSize.w > 0 && (
                <canvas
                  ref={canvasRef}
                  width={canvasSize.w}
                  height={canvasSize.h}
                  className="touch-none cursor-crosshair"
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />
             )}
          </div>
        )}
      </div>

      {/* --- Bottom Post Action --- */}
      {imageDataUrl && (
        <div className="absolute bottom-10 right-10 z-50">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={shareToStory}
            className="group flex items-center gap-3 bg-white text-black pl-5 pr-2 py-2 rounded-full font-bold shadow-2xl shadow-white/20 hover:bg-brand-accent hover:text-white transition-all"
          >
            Share to Story
            <div className="p-2 bg-black rounded-full text-white group-hover:bg-white group-hover:text-brand-accent transition-colors">
              <Check size={20} />
            </div>
          </motion.button>
        </div>
      )}

      {/* --- Text Input Modal --- */}
      <AnimatePresence>
        {showTextInput && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[101] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <div className="w-full max-w-lg">
              <input
                ref={textInputRef}
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddText()}
                placeholder="Type your story..."
                className="w-full bg-transparent border-b-2 border-white/50 focus:border-white text-white text-3xl font-bold py-4 text-center outline-none transition-all placeholder:text-white/30"
              />
              <div className="flex justify-center mt-8 gap-4">
                <button 
                  onClick={() => setShowTextInput(false)}
                  className="px-6 py-2 rounded-full bg-neutral-800 text-white hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddText}
                  className="px-8 py-2 rounded-full bg-white text-black font-bold hover:bg-neutral-200"
                >
                  Add Text
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
