// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/session", () => ({
  origin: () => "http://localhost:3000",
  token: vi.fn(async () => "test-token"),
}));
import { POST } from "./route";
import { token } from "@/lib/session";
const event = {
  id: "9a18ccf0-bb2d-4f8d-bf9e-73db63c1a705",
  title: "New year",
  month: 1,
  day: 1,
  leap: false,
  count: 1,
  from: "2024-01-01",
};
function request(known = {}, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/tasks", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({ event, known }),
  });
}
beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(token).mockResolvedValue("test-token");
});
it("rejects cross-origin requests before fetching", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  expect((await POST(request({}, "https://evil.example"))).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
});
it("requires an OAuth session", async () => {
  vi.mocked(token).mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
});
it("does not recreate a known completed or removed task", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json({ results: [], next_cursor: null }));
  const response = await POST(request({ "0": "old-task" }));
  expect(await response.json()).toMatchObject({ created: 0, updated: 0 });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("creates a non-recurring date and returns its ID", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(Response.json({ results: [], next_cursor: null }))
    .mockResolvedValueOnce(Response.json({ id: "new-task" }));
  const response = await POST(request());
  expect(await response.json()).toMatchObject({
    created: 1,
    known: { "0": "new-task" },
  });
  const payload = JSON.parse(fetch.mock.calls[1][1]!.body as string);
  expect(payload.due_date).toBe("2024-02-10");
  expect(payload.due_string).toBeUndefined();
});
it("updates an unfinished task found on a later page", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(Response.json({ results: [], next_cursor: "page2" }))
    .mockResolvedValueOnce(
      Response.json({
        results: [
          { id: "old-task", description: "Keep notes", is_completed: false },
        ],
        next_cursor: null,
      }),
    )
    .mockResolvedValueOnce(Response.json({ id: "old-task" }));
  const response = await POST(request({ "0": "old-task" }));
  expect(await response.json()).toMatchObject({ created: 0, updated: 1 });
  expect(JSON.parse(fetch.mock.calls[2][1]!.body as string).description).toBe(
    "Keep notes",
  );
});
