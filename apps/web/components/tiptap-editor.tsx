"use client";

import type { JSONContent } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TiptapUnderline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Separator } from "@workspace/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Redo,
  Strikethrough,
  Underline,
  Undo,
} from "lucide-react";
import { useEffect, useRef } from "react";

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  tooltip,
  children,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "inline-flex items-center justify-center rounded-md p-1.5 text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "disabled:pointer-events-none disabled:opacity-50",
            isActive && "bg-accent text-accent-foreground",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

interface TiptapEditorProps {
  initialContent?: JSONContent;
  onChange?: (content: JSONContent) => void;
  editable?: boolean;
  className?: string;
}

export function TiptapEditor({
  initialContent,
  onChange,
  editable = true,
  className,
}: TiptapEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    content: initialContent,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {
          HTMLAttributes: { class: "list-disc list-outside ml-4" },
        },
        orderedList: {
          HTMLAttributes: { class: "list-decimal list-outside ml-4" },
        },
        listItem: {
          HTMLAttributes: { class: "leading-relaxed" },
        },
        blockquote: {
          HTMLAttributes: {
            class:
              "border-l-4 border-primary pl-4 italic text-muted-foreground",
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class:
              "rounded-lg bg-muted border p-4 font-mono text-sm overflow-x-auto",
          },
        },
        code: {
          HTMLAttributes: {
            class: "rounded bg-muted px-1.5 py-0.5 font-mono text-sm",
          },
        },
        horizontalRule: {
          HTMLAttributes: { class: "my-6 border-t border-border" },
        },
        dropcursor: { color: "hsl(var(--primary))", width: 2 },
      }),
      Placeholder.configure({
        placeholder: "Start writing…",
      }),
      Link.configure({
        HTMLAttributes: {
          class:
            "text-primary underline underline-offset-2 hover:text-primary/80 cursor-pointer transition-colors",
        },
        openOnClick: false,
      }),
      TaskList.configure({
        HTMLAttributes: { class: "not-prose space-y-1" },
      }),
      TaskItem.configure({
        HTMLAttributes: { class: "flex items-start gap-2" },
        nested: true,
      }),
      TiptapUnderline,
      Highlight.configure({
        HTMLAttributes: {
          class: "rounded px-1 bg-yellow-200 dark:bg-yellow-800",
        },
      }),
    ],
    onUpdate: ({ editor: e }) => {
      onChangeRef.current?.(e.getJSON());
    },
  });

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-[300px] w-full rounded-lg border border-input bg-background animate-pulse",
          className,
        )}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "w-full rounded-lg border border-input bg-background overflow-hidden",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          !editable && "cursor-default opacity-70",
          className,
        )}
      >
        {editable && (
          <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              tooltip="Bold (Ctrl+B)"
            >
              <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              tooltip="Italic (Ctrl+I)"
            >
              <Italic className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive("underline")}
              tooltip="Underline (Ctrl+U)"
            >
              <Underline className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive("strike")}
              tooltip="Strikethrough"
            >
              <Strikethrough className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive("code")}
              tooltip="Inline code"
            >
              <Code className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              isActive={editor.isActive("highlight")}
              tooltip="Highlight"
            >
              <Highlighter className="size-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              isActive={editor.isActive("heading", { level: 1 })}
              tooltip="Heading 1"
            >
              <Heading1 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 })}
              tooltip="Heading 2"
            >
              <Heading2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={editor.isActive("heading", { level: 3 })}
              tooltip="Heading 3"
            >
              <Heading3 className="size-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              tooltip="Bullet list"
            >
              <List className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              tooltip="Numbered list"
            >
              <ListOrdered className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive("taskList")}
              tooltip="Task list"
            >
              <ListTodo className="size-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              tooltip="Blockquote"
            >
              <Quote className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              tooltip="Horizontal rule"
            >
              <Minus className="size-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              tooltip="Undo (Ctrl+Z)"
            >
              <Undo className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              tooltip="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="size-4" />
            </ToolbarButton>
          </div>
        )}

        <EditorContent
          editor={editor}
          className={cn(
            "prose dark:prose-invert max-w-full",
            "prose-headings:font-semibold prose-headings:tracking-tight",
            "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
            "prose-p:leading-relaxed prose-li:leading-relaxed",
            "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
            "prose-blockquote:border-l-primary prose-blockquote:not-italic",
            "prose-code:before:hidden prose-code:after:hidden",
            "min-h-[250px] px-5 py-4 focus:outline-none",
            "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[250px]",
            "[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
            "[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground",
            "[&_.tiptap_p.is-editor-empty:first-child::before]:opacity-50",
            "[&_.tiptap_p.is-editor-empty:first-child::before]:float-left",
            "[&_.tiptap_p.is-editor-empty:first-child::before]:h-0",
            "[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none",
          )}
        />

        {editable && (
          <BubbleMenu
            editor={editor}
            className="flex overflow-hidden rounded-lg border border-border bg-background shadow-lg"
          >
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn(
                "p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                editor.isActive("bold") && "bg-accent text-accent-foreground",
              )}
            >
              <Bold className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn(
                "p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                editor.isActive("italic") && "bg-accent text-accent-foreground",
              )}
            >
              <Italic className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn(
                "p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                editor.isActive("underline") &&
                  "bg-accent text-accent-foreground",
              )}
            >
              <Underline className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={cn(
                "p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                editor.isActive("strike") && "bg-accent text-accent-foreground",
              )}
            >
              <Strikethrough className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={cn(
                "p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                editor.isActive("code") && "bg-accent text-accent-foreground",
              )}
            >
              <Code className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={cn(
                "p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                editor.isActive("highlight") &&
                  "bg-accent text-accent-foreground",
              )}
            >
              <Highlighter className="size-4" />
            </button>
          </BubbleMenu>
        )}
      </div>
    </TooltipProvider>
  );
}

export type { JSONContent };
