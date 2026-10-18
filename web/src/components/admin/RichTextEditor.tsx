import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Quote, Code, Minus, Undo, Redo, Link as LinkIcon, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, Pilcrow, RemoveFormatting,
  TableIcon, Plus, Trash2, Columns, Rows,
} from "lucide-react";
import { useCallback, useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = "Tulis konten artikel di sini..." }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        protocols: ["http", "https", "mailto", "tel"],
        HTMLAttributes: { class: "text-blue-600 underline", rel: "noopener noreferrer nofollow" },
      }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full mx-auto" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: false, HTMLAttributes: { class: "blog-table" } }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[400px] focus:outline-none p-4",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL:", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  if (!editor) return null;

  const ToolBtn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 ${active ? "bg-accent text-accent-foreground" : ""}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="rounded-lg border border-input bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 border-b border-input bg-muted/30 p-1.5">
        {/* Text formatting */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px bg-border mx-1" />

        {/* Headings */}
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
          <Heading3 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Paragraph">
          <Pilcrow className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px bg-border mx-1" />

        {/* Lists */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px bg-border mx-1" />

        {/* Alignment */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
          <AlignRight className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px bg-border mx-1" />

        {/* Block elements */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
          <Quote className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block">
          <Code className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <Minus className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px bg-border mx-1" />

        {/* Table */}
        <ToolBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">
          <TableIcon className="h-4 w-4" />
        </ToolBtn>
        {editor.isActive("table") && (
          <>
            <ToolBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column">
              <Columns className="h-4 w-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row">
              <Rows className="h-4 w-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table">
              <Trash2 className="h-4 w-4" />
            </ToolBtn>
          </>
        )}

        <div className="w-px bg-border mx-1" />

        {/* Insert */}
        <ToolBtn onClick={setLink} active={editor.isActive("link")} title="Insert Link">
          <LinkIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={addImage} title="Insert Image">
          <ImageIcon className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px bg-border mx-1" />

        {/* Clear & History */}
        <ToolBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">
          <RemoveFormatting className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="h-4 w-4" />
        </ToolBtn>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
