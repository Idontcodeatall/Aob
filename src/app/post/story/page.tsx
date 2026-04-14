"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Type,
  Pen,
  Send,
  Minus,
  Plus,
  Trash2,
  Move,
} from "lucide-react";
import { MediaUploader } from "@/components/MediaUploader";

/* ═══════════════════════════════════════════════
   Story Canvas — Pure HTML5 Canvas implementation
   No react-konva needed: lighter, faster, SSR-safe
   ═══════════════════════════════════════════════ */

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

type ToolMode = "select" | "text" | "draw";

function StoryCanvas({
  imageDataUrl,
  onFinish,
}: {
  imageDataUrl: string;
  onFinish: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<ToolMode>("select");
  const [brushSize, setBrushSize] = useState(4);
  const [drawColor, setDrawColor] = useState("#800000");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [lines, setLines] = useState<DrawLine[]>([]);
  const [currentLine, setCurrentLine] = useState<DrawLine | null>(null);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  // Text input state
  const [showTextInput, setShowTextInput] = useState(false);
  const [newText, setNewText] = useState("");
  const [textClickPos, setTextClickPos] = useState({ x: 0, y: 0 });
  const textInputRef = useRef<HTMLInputElement>(null);

  // Dragging text state
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load background image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  // Calculate canvas size fitting 9:16 in the container
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;
      // 9:16 aspect ratio for stories
      const targetRatio = 9 / 16;
      let w = containerW;
      let h = w / targetRatio;
      if (h > containerH) {
        h = containerH;
        w = h * targetRatio;
      }
      setCanvasSize({ w: Math.floor(w), h: Math.floor(h) });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Redraw canvas whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImage || canvasSize.w === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

    // Draw background image (cover fit)
    const imgRatio = bgImage.width / bgImage.height;
    const canvasRatio = canvasSize.w / canvasSize.h;
    let sx = 0,
      sy = 0,
      sw = bgImage.width,
      sh = bgImage.height;
    if (imgRatio > canvasRatio) {
      sw = bgImage.height * canvasRatio;
      sx = (bgImage.width - sw) / 2;
    } else {
      sh = bgImage.width / canvasRatio;
      sy = (bgImage.height - sh) / 2;
    }
    ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, canvasSize.w, canvasSize.h);

    // Draw lines
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

    // Draw text elements
    textElements.forEach((te) => {
      ctx.font = `bold ${te.fontSize}px "Playfair Display", serif`;
      ctx.fillStyle = te.color;
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(te.text, te.x, te.y);
      ctx.shadowColor = "transparent";
    });
  }, [bgImage, lines, currentLine, textElements, canvasSize]);

  // Get canvas-relative coordinates from mouse/touch event
  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasSize.w / rect.width;
      const scaleY = canvasSize.h / rect.height;
      if ("touches" in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [canvasSize]
  );

  // Find text element at position
  const findTextAt = useCallback(
    (x: number, y: number): TextElement | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Check in reverse order (top-most first)
      for (let i = textElements.length - 1; i >= 0; i--) {
        const te = textElements[i];
        ctx.font = `bold ${te.fontSize}px "Playfair Display", serif`;
        const metrics = ctx.measureText(te.text);
        const textW = metrics.width;
        const textH = te.fontSize;
        if (
          x >= te.x - 4 &&
          x <= te.x + textW + 4 &&
          y >= te.y - textH &&
          y <= te.y + 4
        ) {
          return te;
        }
      }
      return null;
    },
    [textElements]
  );

  // ─── Pointer Handlers ───
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);

    if (tool === "draw") {
      setIsDrawing(true);
      setCurrentLine({
        points: [pos],
        color: drawColor,
        width: brushSize,
      });
    } else if (tool === "text") {
      setTextClickPos(pos);
      setShowTextInput(true);
      setNewText("");
      setTimeout(() => textInputRef.current?.focus(), 50);
    } else if (tool === "select") {
      const hit = findTextAt(pos.x, pos.y);
      if (hit) {
        setDraggingTextId(hit.id);
        setDragOffset({ x: pos.x - hit.x, y: pos.y - hit.y });
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);

    if (tool === "draw" && isDrawing && currentLine) {
      setCurrentLine({
        ...currentLine,
        points: [...currentLine.points, pos],
      });
    } else if (tool === "select" && draggingTextId) {
      setTextElements((prev) =>
        prev.map((te) =>
          te.id === draggingTextId
            ? { ...te, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y }
            : te
        )
      );
    }
  };

  const handlePointerUp = () => {
    if (tool === "draw" && currentLine) {
      setLines((prev) => [...prev, currentLine]);
      setCurrentLine(null);
      setIsDrawing(false);
    }
    setDraggingTextId(null);
  };

  const handleAddText = () => {
    if (!newText.trim()) {
      setShowTextInput(false);
      return;
    }
    setTextElements((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: newText,
        x: textClickPos.x,
        y: textClickPos.y,
        fontSize: 28,
        color: textColor,
      },
    ]);
    setNewText("");
    setShowTextInput(false);
  };

  const handleClearAll = () => {
    setLines([]);
    setTextElements([]);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ─── Tool Bar ─── */}
      <div className="flex items-center justify-between bg-neutral-900/80 border border-neutral-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Select tool */}
          <button
            onClick={() => setTool("select")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              tool === "select"
                ? "bg-neutral-700 text-white shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Move size={16} />
            Move
          </button>

          {/* Text tool */}
          <button
            onClick={() => setTool("text")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              tool === "text"
                ? "bg-brand-accent text-white shadow-sm shadow-brand-accent/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Type size={16} />
            Text
          </button>

          {/* Draw tool */}
          <button
            onClick={() => setTool("draw")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              tool === "draw"
                ? "bg-brand-accent text-white shadow-sm shadow-brand-accent/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Pen size={16} />
            Markup
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-neutral-700 mx-1" />

          {/* Brush size — only visible in draw mode */}
          {tool === "draw" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBrushSize((s) => Math.max(1, s - 1))}
                className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <Minus size={14} />
              </button>
              <div className="flex items-center justify-center w-8">
                <div
                  className="rounded-full"
                  style={{
                    width: `${Math.max(6, brushSize * 2)}px`,
                    height: `${Math.max(6, brushSize * 2)}px`,
                    backgroundColor: drawColor,
                  }}
                />
              </div>
              <button
                onClick={() => setBrushSize((s) => Math.min(20, s + 1))}
                className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <Plus size={14} />
              </button>
              {/* Color Picker */}
              <label className="relative w-7 h-7 rounded-full cursor-pointer ring-2 ring-neutral-600 hover:ring-neutral-400 transition-all overflow-hidden ml-1" style={{ backgroundColor: drawColor }}>
                <input
                  type="color"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          )}

          {/* Text color picker — only visible in text mode */}
          {tool === "text" && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Text Color</span>
              <label className="relative w-7 h-7 rounded-full cursor-pointer ring-2 ring-neutral-600 hover:ring-neutral-400 transition-all overflow-hidden" style={{ backgroundColor: textColor }}>
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

        <button
          onClick={handleClearAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 size={14} />
          Clear
        </button>
      </div>

      {/* ─── Canvas Area ─── */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center bg-neutral-950 rounded-2xl overflow-hidden min-h-[400px]"
      >
        {canvasSize.w > 0 && (
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            className="rounded-lg shadow-2xl"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              cursor:
                tool === "draw"
                  ? "crosshair"
                  : tool === "text"
                  ? "text"
                  : "grab",
              touchAction: "none",
            }}
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

      {/* ─── Text Input Overlay ─── */}
      <AnimatePresence>
        {showTextInput && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-700 px-4 py-4"
          >
            <div className="max-w-lg mx-auto flex items-center gap-3">
              <input
                ref={textInputRef}
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddText()}
                placeholder="Type your text..."
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-brand-text font-serif text-lg focus:outline-none focus:border-brand-accent transition-colors"
              />
              <button
                onClick={handleAddText}
                className="px-5 py-3 bg-brand-accent rounded-xl text-white font-semibold hover:bg-brand-accent/90 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowTextInput(false)}
                className="px-4 py-3 text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Post Button ─── */}
      <motion.button
        onClick={onFinish}
        whileTap={{ scale: 0.97 }}
        className="w-full py-3.5 rounded-xl font-semibold text-white bg-brand-accent hover:bg-brand-accent/90 flex items-center justify-center gap-2.5 shadow-lg shadow-brand-accent/20 transition-all"
      >
        <Send size={18} />
        Post Story
      </motion.button>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Page Shell — Upload → Canvas flow
   ═══════════════════════════════════════════════ */
export default function AddToStoryPage() {
  const router = useRouter();
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const handleFinish = () => {
    // Stories display not yet built — redirect home with success
    router.push("/");
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <button
          onClick={() => (imageDataUrl ? setImageDataUrl(null) : router.back())}
          className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-brand-text transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-text">
            Add to Story
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {imageDataUrl
              ? "Use the tools to annotate your image"
              : "Choose an image for your story"}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {!imageDataUrl ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex items-center"
            >
              <MediaUploader
                onImageSelect={setImageDataUrl}
                aspectHint="9:16 portrait (story)"
              />
            </motion.div>
          ) : (
            <motion.div
              key="canvas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <StoryCanvas
                imageDataUrl={imageDataUrl}
                onFinish={handleFinish}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
