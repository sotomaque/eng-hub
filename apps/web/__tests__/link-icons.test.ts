import { describe, expect, test } from "bun:test";
import { getLinkMeta } from "@/lib/constants/link-icons";

describe("getLinkMeta", () => {
  test("matches Figma URLs", () => {
    const meta = getLinkMeta("https://figma.com/file/abc123");
    expect(meta.label).toBe("Figma");
    expect(meta.color).toBe("text-purple-500");
  });

  test("matches GitHub URLs", () => {
    const meta = getLinkMeta("https://github.com/org/repo");
    expect(meta.label).toBe("GitHub");
  });

  test("matches GitLab URLs (gitlab.com)", () => {
    const meta = getLinkMeta("https://gitlab.com/org/repo");
    expect(meta.label).toBe("GitLab");
  });

  test("matches self-hosted GitLab (gitlab.company.com)", () => {
    const meta = getLinkMeta("https://gitlab.company.com/project");
    expect(meta.label).toBe("GitLab");
  });

  test("matches Jira via atlassian.net/jira", () => {
    const meta = getLinkMeta("https://myteam.atlassian.net/jira/projects/ENG");
    expect(meta.label).toBe("Jira");
  });

  test("matches self-hosted Jira (jira.company.com)", () => {
    const meta = getLinkMeta("https://jira.company.com/browse/ENG-123");
    expect(meta.label).toBe("Jira");
  });

  test("matches Confluence via atlassian.net/wiki", () => {
    const meta = getLinkMeta("https://myteam.atlassian.net/wiki/spaces/ENG");
    expect(meta.label).toBe("Confluence");
  });

  test("matches Confluence via confluence subdomain", () => {
    const meta = getLinkMeta("https://confluence.company.com/page/123");
    expect(meta.label).toBe("Confluence");
  });

  test("matches Notion URLs (notion.so)", () => {
    const meta = getLinkMeta("https://notion.so/page-abc");
    expect(meta.label).toBe("Notion");
  });

  test("matches Notion site URLs (notion.site)", () => {
    const meta = getLinkMeta("https://myteam.notion.site/page");
    expect(meta.label).toBe("Notion");
  });

  test("matches Linear URLs", () => {
    const meta = getLinkMeta("https://linear.app/team/issue/ENG-1");
    expect(meta.label).toBe("Linear");
  });

  test("matches Google Docs URLs", () => {
    const meta = getLinkMeta("https://docs.google.com/document/d/abc123");
    expect(meta.label).toBe("Google Docs");
  });

  test("matches Google Drive URLs", () => {
    const meta = getLinkMeta("https://drive.google.com/drive/folders/abc");
    expect(meta.label).toBe("Google Drive");
  });

  test("matches Slack URLs", () => {
    const meta = getLinkMeta("https://myteam.slack.com/archives/C123");
    expect(meta.label).toBe("Slack");
  });

  test("matches Trello URLs", () => {
    const meta = getLinkMeta("https://trello.com/b/abc123");
    expect(meta.label).toBe("Trello");
  });

  test("matches Miro URLs", () => {
    const meta = getLinkMeta("https://miro.com/app/board/abc=");
    expect(meta.label).toBe("Miro");
  });

  test("is case-insensitive", () => {
    const meta = getLinkMeta("https://GITHUB.COM/org/repo");
    expect(meta.label).toBe("GitHub");
  });

  test("returns fallback for unknown URLs", () => {
    const meta = getLinkMeta("https://example.com/some-page");
    expect(meta.label).toBe("Link");
    expect(meta.color).toBe("text-muted-foreground");
  });

  test("returns fallback for empty string", () => {
    const meta = getLinkMeta("");
    expect(meta.label).toBe("Link");
  });
});
