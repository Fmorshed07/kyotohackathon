import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLumaEvent, handleLumaEventImportRequest } from "../../server/luma/handler";
import { getUserRoleFromFirestore, verifyFirebaseIdToken } from "../../server/email/auth";

vi.mock("../../server/email/auth", () => ({
  verifyFirebaseIdToken: vi.fn(), getUserRoleFromFirestore: vi.fn(),
  isAdminRole: (role: string) => ["admin", "admins"].includes(role),
  isPortalAdminEmail: (email: string) => /^portal-admin\..+@firebase\.app$/.test(email),
}));
const request = { method: "POST", authorization: "Bearer test-token", body: { url: "https://luma.com/ai-weekend" } };
const html = '<script type="application/ld+json">{"@type":"Event","name":"AI Weekend","startDate":"2026-10-17T05:00:00Z"}</script>';
const htmlResponse = () => new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
beforeEach(() => {
  vi.mocked(verifyFirebaseIdToken).mockResolvedValue({ uid: "host-id", email: "host@example.com" });
  vi.mocked(getUserRoleFromFirestore).mockResolvedValue("host");
  vi.stubGlobal("AbortSignal", { timeout: () => new AbortController().signal });
});
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("Luma import access", () => {
  it("accepts host requests", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse()));
    const result = await handleLumaEventImportRequest(request);
    expect(result.ok).toBe(true);
  });
  it.each(["admin", "admins"])("accepts %s requests", async (role) => {
    vi.mocked(getUserRoleFromFirestore).mockResolvedValue(role);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse()));
    expect((await handleLumaEventImportRequest(request)).ok).toBe(true);
  });
  it("rejects unsupported methods and anonymous users before fetching", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect(await handleLumaEventImportRequest({ ...request, method: "GET" })).toMatchObject({ ok: false, status: 405 });
    vi.mocked(verifyFirebaseIdToken).mockRejectedValue(new Error("No token"));
    expect(await handleLumaEventImportRequest(request)).toMatchObject({ ok: false, status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects participant access and non-Luma destinations", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    vi.mocked(getUserRoleFromFirestore).mockResolvedValue("participant");
    expect(await handleLumaEventImportRequest(request)).toMatchObject({ ok: false, status: 403 });
    vi.mocked(getUserRoleFromFirestore).mockResolvedValue("host");
    expect(await handleLumaEventImportRequest({ ...request, body: { url: "https://127.0.0.1/event" } })).toMatchObject({ ok: false, status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("bounded public page fetching", () => {
  it("follows lu.ma redirects to luma.com without forwarding host credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: "https://luma.com/ai-weekend" } })).mockResolvedValueOnce(htmlResponse());
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchLumaEvent("https://lu.ma/ai-weekend");
    expect(result.sourceUrl).toBe("https://luma.com/ai-weekend");
    expect(fetchMock.mock.calls[0][1].redirect).toBe("manual");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
  it("never follows a redirect outside Luma", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { Location: "https://127.0.0.1/event" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchLumaEvent(request.body.url)).rejects.toThrow("Use an HTTPS event link");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("stops redirect loops", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(null, { status: 302, headers: { Location: "/ai-weekend" } })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchLumaEvent(request.body.url)).rejects.toThrow("redirected too many times");
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
  it("limits the actual downloaded body even without a Content-Length", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x".repeat(2_000_001), { headers: { "Content-Type": "text/html" } })));
    await expect(fetchLumaEvent(request.body.url)).rejects.toThrow("too large to import");
  });
  it("returns useful not-found and timeout errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    expect(await handleLumaEventImportRequest(request)).toMatchObject({ ok: false, error: "This Luma event was not found. Check the link." });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new Error("timeout"), { name: "TimeoutError" })));
    expect(await handleLumaEventImportRequest(request)).toMatchObject({ ok: false, status: 504 });
  });
});
