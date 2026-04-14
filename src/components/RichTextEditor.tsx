"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Subscript as SubscriptIcon, 
  Superscript as SuperscriptIcon,
  List, 
  ListOrdered,
  Smile
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

type RichTextEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const EMOJIS = [
  // Global Top
  "😂", "❤️", "🤣", "👍", "🙏", "😘", "🥰", "😊",
  // Reader / Vibe
  "📖", "📚", "🔖", "✍️", "🖋️", "🧐", "✨", "☕", "🕯️", "🌙", "🕰️", "🌿",
  // Symbols / Ratings
  "⭐", "🌟", "📍", "💭", "💬", "💡",
  // Emotions (New)
  "😔", "😢", "😠", "😡", "🤢"
];

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Subscript,
      Superscript
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "w-full bg-transparent p-4 min-h-[300px] text-brand-text focus:outline-none resize-y prose prose-invert prose-sm max-w-none",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) return null;

  const toolbarBtn = (
    isActive: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    title: string
  ) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded transition-colors ${
        isActive
          ? "text-brand-accent bg-neutral-800"
          : "text-neutral-400 hover:text-brand-text hover:bg-neutral-800"
      }`}
    >
      {icon}
    </button>
  );

  const addEmoji = (emoji: string) => {
    editor.chain().focus().insertContent(emoji).run();
    setShowEmojiPicker(false);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden focus-within:border-brand-accent transition-colors">
      <style jsx global>{`
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .ProseMirror sub {
          vertical-align: sub;
          font-size: smaller;
        }
        .ProseMirror sup {
          vertical-align: super;
          font-size: smaller;
        }
        .ProseMirror u {
          text-decoration: underline !important;
        }
      `}</style>
      
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-1 border-b border-neutral-800 p-2 bg-neutral-900/80">
        {toolbarBtn(
          editor.isActive("bold"),
          () => editor.chain().focus().toggleBold().run(),
          <Bold size={16} />,
          "Bold (Ctrl+B)"
        )}
        {toolbarBtn(
          editor.isActive("italic"),
          () => editor.chain().focus().toggleItalic().run(),
          <Italic size={16} />,
          "Italic (Ctrl+I)"
        )}
        {toolbarBtn(
          editor.isActive("underline"),
          () => editor.chain().focus().toggleUnderline().run(),
          <UnderlineIcon size={16} />,
          "Underline (Ctrl+U)"
        )}
        {toolbarBtn(
          editor.isActive("strike"),
          () => editor.chain().focus().toggleStrike().run(),
          <Strikethrough size={16} />,
          "Strike"
        )}
        
        <div className="w-px h-4 bg-neutral-800 mx-1" />
        
        {toolbarBtn(
          editor.isActive("subscript"),
          () => editor.chain().focus().toggleSubscript().run(),
          <SubscriptIcon size={16} />,
          "Subscript"
        )}
        {toolbarBtn(
          editor.isActive("superscript"),
          () => editor.chain().focus().toggleSuperscript().run(),
          <SuperscriptIcon size={16} />,
          "Superscript"
        )}

        <div className="w-px h-4 bg-neutral-800 mx-1" />
        
        {toolbarBtn(
          editor.isActive("bulletList"),
          () => editor.chain().focus().toggleBulletList().run(),
          <List size={16} />,
          "Bullet List"
        )}
        {toolbarBtn(
          editor.isActive("orderedList"),
          () => editor.chain().focus().toggleOrderedList().run(),
          <ListOrdered size={16} />,
          "Numbered List"
        )}

        <div className="w-px h-4 bg-neutral-800 mx-1" />

        {/* Emoji Selector */}
        <div className="relative" ref={emojiPickerRef}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded transition-colors ${
              showEmojiPicker
                ? "text-brand-accent bg-neutral-800"
                : "text-neutral-400 hover:text-brand-text hover:bg-neutral-800"
            }`}
            title="Insert Emoji"
          >
            <Smile size={16} />
          </button>
          
          {showEmojiPicker && (
            <div className="absolute top-full right-0 mt-2 p-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl z-[100] w-64">
              <div className="grid grid-cols-6 gap-1">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => addEmoji(emoji)}
                    className="p-1.5 text-lg hover:bg-neutral-800 rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor canvas */}
      <div className="relative">
        <EditorContent editor={editor} />
        {/* Placeholder overlay */}
        {editor.isEmpty && placeholder && (
          <div className="absolute top-4 left-4 text-neutral-600 pointer-events-none select-none text-sm">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
