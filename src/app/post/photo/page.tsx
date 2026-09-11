"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, BookOpen, X, Search, Loader2, FileText } from "lucide-react";
import { MediaUploader } from "@/components/MediaUploader";
import { useReviews } from "@/lib/ReviewContext";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useDebounce } from "@/hooks/useDebounce";
import { BookCover } from "@/components/BookCover";
import { supabase } from "@/utils/supabaseClient";

interface BookSuggestion {
  id: string;
  title: string;
  authors: string[];
  thumbnail: string;
}

export default function NewPostPage() {
  const router = useRouter();
  const { session, refreshFeed } = useReviews();

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controls whether we show the compose form (true once image chosen or skipped)
  const [inComposeStep, setInComposeStep] = useState(false);

  // Search States
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedTitle = useDebounce(bookTitle, 500);

  useEffect(() => {
    if (!debouncedTitle || debouncedTitle.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(debouncedTitle).replace(/%20/g, "+")}&printType=books&orderBy=relevance&maxResults=5&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || ""}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const items: BookSuggestion[] = (data.items || []).map((item: any) => ({
          id: item.id,
          title: item.volumeInfo?.title || "Unknown Title",
          authors: item.volumeInfo?.authors || ["Unknown Author"],
          thumbnail: item.volumeInfo?.imageLinks?.thumbnail || "",
        }));
        setSuggestions(items);
        setShowDropdown(items.length > 0);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    };

    fetchSuggestions();
  }, [debouncedTitle]);

  const handleSelectBook = (book: BookSuggestion) => {
    setBookTitle(book.title);
    setBookAuthor(book.authors.join(", "));
    setShowDropdown(false);
  };

  const handleImageSelect = (dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setInComposeStep(true);
  };

  const handleFileSelect = (file: File) => {
    setImageFile(file);
  };

  const handleSkipToText = () => {
    setImageDataUrl(null);
    setImageFile(null);
    setInComposeStep(true);
  };

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

  const handlePublish = async () => {
    if (!session?.user?.id) {
      setError("You must be logged in to post.");
      return;
    }

    const captionHasContent = stripHtml(caption).length > 0;
    if (!imageDataUrl && !captionHasContent) {
      setError("Add a photo or write something before publishing.");
      return;
    }

    setIsPublishing(true);
    setError(null);

    let image_url: string | null = null;

    // Upload image to post_images bucket if one was selected
    if (imageFile) {
      try {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const fileName = `${session.user.id}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("post_images")
          .upload(fileName, imageFile, { contentType: imageFile.type });

        if (uploadError) {
          console.error("Storage upload error:", uploadError.message);
          setError("Image upload failed. Please try again.");
          setIsPublishing(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("post_images")
          .getPublicUrl(fileName);
        image_url = publicUrl;
      } catch (err) {
        console.error("Unexpected upload error:", err);
        setError("Image upload failed. Please try again.");
        setIsPublishing(false);
        return;
      }
    }

    const post_type = image_url ? "photo" : "text";

    const { error: insertError } = await supabase.from("posts").insert([{
      user_id: session.user.id,
      caption: captionHasContent ? caption : null,
      image_url,
      post_type,
      book_title: bookTitle.trim() || null,
      book_author: bookAuthor.trim() || null,
      likes_count: 0,
      comments_count: 0,
    }]);

    if (insertError) {
      console.error("Post insert error:", insertError.message);
      setError("Failed to publish. Please try again.");
      setIsPublishing(false);
      return;
    }

    refreshFeed();
    router.push("/");
  };

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => {
            if (inComposeStep) {
              setInComposeStep(false);
              setImageDataUrl(null);
              setImageFile(null);
            } else {
              router.back();
            }
          }}
          className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-brand-text transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-text">New Post</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {inComposeStep ? "Refine your post and share" : "Choose an image or write a text post"}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── STEP 1: Upload / Choose ─── */}
        {!inComposeStep && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <MediaUploader
              onImageSelect={handleImageSelect}
              onFileSelect={handleFileSelect}
              aspectHint="4:5 portrait"
            />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-neutral-800" />
              <span className="text-xs text-neutral-600 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-neutral-800" />
            </div>
            <button
              onClick={handleSkipToText}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-700 hover:border-neutral-500 bg-neutral-900/50 hover:bg-neutral-900 text-neutral-400 hover:text-brand-text transition-all text-sm font-medium"
            >
              <FileText size={16} />
              Write a text post
            </button>
          </motion.div>
        )}

        {/* ─── STEP 2: Compose ─── */}
        {inComposeStep && (
          <motion.div
            key="compose"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Image Preview — only shown if an image was selected */}
            {imageDataUrl && (
              <div className="w-full max-w-md mx-auto aspect-[4/5] rounded-3xl overflow-hidden bg-neutral-900 shadow-2xl ring-1 ring-neutral-800 relative group">
                <img src={imageDataUrl} alt="Post preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setImageDataUrl(null); setImageFile(null); }}
                  className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="max-w-md mx-auto space-y-8">
              {/* Caption */}
              <section className="space-y-3">
                <label className="block text-sm font-semibold text-brand-text uppercase tracking-wider">
                  Caption{" "}
                  <span className="text-[10px] text-neutral-600 ml-2 font-normal lowercase tracking-normal">
                    {imageDataUrl ? "(optional)" : "(required for text posts)"}
                  </span>
                </label>
                <div className="p-1 bg-neutral-900 border border-neutral-800 rounded-2xl relative">
                  <RichTextEditor
                    content={caption}
                    onChange={setCaption}
                    placeholder="Share the story behind this post..."
                  />
                </div>
              </section>

              {/* Book Connection */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wider border-b border-neutral-800 pb-2">
                  Book Connection{" "}
                  <span className="text-[10px] text-neutral-600 ml-2 font-normal lowercase tracking-normal">
                    (optional)
                  </span>
                </h2>
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      <BookOpen size={12} className="inline mr-1 opacity-60" />
                      Book Title
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                        placeholder="Search or enter manually..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-brand-accent transition-colors placeholder:text-neutral-600 pr-10"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600">
                        {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {showDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
                        >
                          {suggestions.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => handleSelectBook(s)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-neutral-800 transition-colors text-left border-b border-neutral-800 last:border-0"
                            >
                              <div className="w-8 h-12 bg-neutral-800 rounded overflow-hidden shrink-0">
                                <BookCover url={s.thumbnail} alt={s.title} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-brand-text truncate">{s.title}</p>
                                <p className="text-xs text-neutral-500 truncate">{s.authors.join(", ")}</p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Author</label>
                    <input
                      type="text"
                      value={bookAuthor}
                      onChange={(e) => setBookAuthor(e.target.value)}
                      placeholder="e.g. Haruki Murakami"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-brand-accent transition-colors placeholder:text-neutral-600"
                    />
                  </div>
                </div>
              </section>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              {/* Publish Button */}
              <motion.button
                onClick={handlePublish}
                disabled={isPublishing}
                whileTap={{ scale: 0.97 }}
                className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 shadow-xl transition-all duration-300 ${
                  isPublishing
                    ? "bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none"
                    : "bg-brand-accent hover:bg-brand-accent/90 shadow-brand-accent/30"
                }`}
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Publish Post
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
