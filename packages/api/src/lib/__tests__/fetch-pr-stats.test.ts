import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { fetchPRStats } from "../github";

// ── Helpers ─────────────────────────────────────────────────

function makeGraphQLResponse(
  nodes: Array<{
    author: string;
    createdAt: string;
    merged?: boolean;
    mergedAt?: string | null;
  }>,
  hasNextPage = false,
  endCursor: string | null = null,
) {
  return {
    data: {
      repository: {
        pullRequests: {
          pageInfo: { hasNextPage, endCursor },
          nodes: nodes.map((n) => ({
            author: { login: n.author },
            headRefName: "feat/test",
            state: n.merged ? "MERGED" : "OPEN",
            merged: n.merged ?? false,
            mergedAt: n.mergedAt ?? null,
            createdAt: n.createdAt,
            reviews: { nodes: [] },
          })),
        },
      },
    },
  };
}

// ── Tests ───────────────────────────────────────────────────

describe("fetchPRStats", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns empty array when no token provided", async () => {
    const result = await fetchPRStats("owner", "repo", undefined);
    expect(result).toEqual([]);
  });

  test("fetches all PRs when no since is provided", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            makeGraphQLResponse([
              {
                author: "alice",
                createdAt: "2024-01-01T00:00:00Z",
                merged: true,
                mergedAt: "2024-01-02T00:00:00Z",
              },
              {
                author: "bob",
                createdAt: "2023-06-01T00:00:00Z",
                merged: true,
                mergedAt: "2023-06-02T00:00:00Z",
              },
            ]),
          ),
          { status: 200 },
        ),
      ),
    );
    globalThis.fetch = mockFetch;

    const result = await fetchPRStats("owner", "repo", "token");

    expect(result).toHaveLength(2);
    expect(result[0]?.author).toBe("alice");
    expect(result[1]?.author).toBe("bob");
  });

  test("stops pagination when PRs are older than since date", async () => {
    let callCount = 0;
    const mockFetch = mock(() => {
      callCount++;
      if (callCount === 1) {
        // Page 1: mix of recent and old PRs (ordered DESC by createdAt)
        return Promise.resolve(
          new Response(
            JSON.stringify(
              makeGraphQLResponse(
                [
                  {
                    author: "alice",
                    createdAt: "2025-03-01T00:00:00Z",
                    merged: true,
                    mergedAt: "2025-03-02T00:00:00Z",
                  },
                  {
                    author: "bob",
                    createdAt: "2025-02-01T00:00:00Z",
                    merged: true,
                    mergedAt: "2025-02-02T00:00:00Z",
                  },
                  // This PR is before the since date — should stop here
                  {
                    author: "charlie",
                    createdAt: "2024-06-01T00:00:00Z",
                    merged: true,
                    mergedAt: "2024-06-02T00:00:00Z",
                  },
                ],
                true, // hasNextPage
                "cursor-page-2",
              ),
            ),
            { status: 200 },
          ),
        );
      }
      // Page 2 should never be reached
      return Promise.resolve(
        new Response(
          JSON.stringify(
            makeGraphQLResponse([{ author: "old-contributor", createdAt: "2023-01-01T00:00:00Z" }]),
          ),
          { status: 200 },
        ),
      );
    });
    globalThis.fetch = mockFetch;

    const result = await fetchPRStats("owner", "repo", "token", "2025-01-01");

    // Should only include PRs from 2025 (alice and bob), not charlie or page 2
    expect(result).toHaveLength(2);
    expect(result[0]?.author).toBe("alice");
    expect(result[1]?.author).toBe("bob");
    // Should only have made 1 fetch call (stopped after page 1 hit the cutoff)
    expect(callCount).toBe(1);
  });

  test("fetches multiple pages when all PRs are within since range", async () => {
    let callCount = 0;
    const mockFetch = mock(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              makeGraphQLResponse(
                [{ author: "alice", createdAt: "2025-03-01T00:00:00Z" }],
                true,
                "cursor-page-2",
              ),
            ),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify(
            makeGraphQLResponse([{ author: "bob", createdAt: "2025-02-01T00:00:00Z" }]),
          ),
          { status: 200 },
        ),
      );
    });
    globalThis.fetch = mockFetch;

    const result = await fetchPRStats("owner", "repo", "token", "2025-01-01");

    expect(result).toHaveLength(2);
    expect(callCount).toBe(2);
  });

  test("handles GraphQL errors", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ errors: [{ message: "Bad credentials" }] }), { status: 200 }),
      ),
    );

    expect(fetchPRStats("owner", "repo", "token")).rejects.toThrow("Bad credentials");
  });

  test("handles non-200 HTTP responses", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })),
    );

    expect(fetchPRStats("owner", "repo", "token")).rejects.toThrow("GitHub GraphQL error: 401");
  });
});
