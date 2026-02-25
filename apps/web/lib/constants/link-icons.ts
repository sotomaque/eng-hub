import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  FileText,
  GitBranch,
  Globe,
  Layout,
  MessageSquare,
  Pen,
  SquareKanban,
  Trello,
} from "lucide-react";

type LinkMeta = {
  icon: LucideIcon;
  label: string;
  color: string;
};

const SERVICE_MAP: { pattern: string; meta: LinkMeta }[] = [
  {
    pattern: "figma.com",
    meta: { icon: Pen, label: "Figma", color: "text-purple-500" },
  },
  {
    pattern: "confluence",
    meta: { icon: BookOpen, label: "Confluence", color: "text-blue-500" },
  },
  {
    pattern: "atlassian.net/wiki",
    meta: { icon: BookOpen, label: "Confluence", color: "text-blue-500" },
  },
  {
    pattern: "atlassian.net/jira",
    meta: { icon: SquareKanban, label: "Jira", color: "text-blue-600" },
  },
  {
    pattern: "jira.",
    meta: { icon: SquareKanban, label: "Jira", color: "text-blue-600" },
  },
  {
    pattern: "github.com",
    meta: { icon: GitBranch, label: "GitHub", color: "text-foreground" },
  },
  {
    pattern: "gitlab.com",
    meta: { icon: GitBranch, label: "GitLab", color: "text-orange-500" },
  },
  {
    pattern: "gitlab.",
    meta: { icon: GitBranch, label: "GitLab", color: "text-orange-500" },
  },
  {
    pattern: "notion.so",
    meta: { icon: FileText, label: "Notion", color: "text-foreground" },
  },
  {
    pattern: "notion.site",
    meta: { icon: FileText, label: "Notion", color: "text-foreground" },
  },
  {
    pattern: "linear.app",
    meta: { icon: Layout, label: "Linear", color: "text-indigo-500" },
  },
  {
    pattern: "docs.google.com",
    meta: { icon: FileText, label: "Google Docs", color: "text-blue-500" },
  },
  {
    pattern: "drive.google.com",
    meta: { icon: FileText, label: "Google Drive", color: "text-yellow-500" },
  },
  {
    pattern: "slack.com",
    meta: { icon: MessageSquare, label: "Slack", color: "text-pink-500" },
  },
  {
    pattern: "trello.com",
    meta: { icon: Trello, label: "Trello", color: "text-blue-400" },
  },
  {
    pattern: "miro.com",
    meta: { icon: Layout, label: "Miro", color: "text-yellow-500" },
  },
];

const FALLBACK: LinkMeta = {
  icon: Globe,
  label: "Link",
  color: "text-muted-foreground",
};

export function getLinkMeta(url: string): LinkMeta {
  const lower = url.toLowerCase();
  for (const entry of SERVICE_MAP) {
    if (lower.includes(entry.pattern)) {
      return entry.meta;
    }
  }
  return FALLBACK;
}
