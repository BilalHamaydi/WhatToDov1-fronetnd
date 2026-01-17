import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/vue";
import { nextTick } from "vue";

import TodoList from "../components/TodoList.vue";

// ✅ immer verfügbar (global in dieser Datei)
const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function resJson(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  } as any);
}

function resText(text: string, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: async () => ({}),
    text: async () => text,
    headers: { "Content-Type": "text/plain" },
  } as any);
}

function mockFetchRouter(
  handlers: Array<{
    match: (url: string, method: string) => boolean;
    handle: () => Promise<any>;
  }>
) {
  return vi.fn().mockImplementation((input: any, init?: any) => {
    const url = String(input);
    const method = String(init?.method ?? "GET").toUpperCase();
    const h = handlers.find((x) => x.match(url, method));
    if (!h) throw new Error(`Unmocked fetch: ${method} ${url}`);
    return h.handle();
  });
}

// ✅ Helper: mount + alle fetch + Vue updates sicher “durchspülen”
async function mountAndWait() {
  render(TodoList);
  await flushPromises();
  await nextTick();
  await flushPromises();
  await nextTick();
}

describe("TodoList", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("lädt Tasks + Kategorien beim Start", async () => {
    const fetchMock = mockFetchRouter([
      { match: (u, m) => m === "GET" && u.includes("/tasks"), handle: () => resJson([]) },
      { match: (u, m) => m === "GET" && u.includes("/categories"), handle: () => resJson(["Uni"]) },
    ]);
    (globalThis as any).fetch = fetchMock;

    await mountAndWait();

    expect(screen.getByText("ToDo-Liste")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/tasks"))).toBe(true);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/categories"))).toBe(true);
  });

  it("zeigt Kategorie im Dropdown", async () => {
    (globalThis as any).fetch = mockFetchRouter([
      { match: (u, m) => m === "GET" && u.includes("/tasks"), handle: () => resJson([]) },
      { match: (u, m) => m === "GET" && u.includes("/categories"), handle: () => resJson(["Uni"]) },
    ]);

    await mountAndWait();

    expect(await screen.findByRole("option", { name: "Uni" })).toBeInTheDocument();
  });

  it("erstellt eine Task (POST) und zeigt sie links an", async () => {
    const created = { id: 1, taskName: "Neu", done: false, important: false, category: "", color: "#0d6efd", date: null };

    (globalThis as any).fetch = mockFetchRouter([
      { match: (u, m) => m === "GET" && u.includes("/tasks"), handle: () => resJson([]) },
      { match: (u, m) => m === "GET" && u.includes("/categories"), handle: () => resJson([]) },
      { match: (u, m) => m === "POST" && u.includes("/tasks"), handle: () => resJson(created) },
    ]);

    await mountAndWait();

    const input = await screen.findByPlaceholderText("Neue Aufgabe…");
    await fireEvent.update(input, "Neu");
    await fireEvent.click(screen.getByTitle("Task hinzufügen"));

    await flushPromises();
    await nextTick();

    expect(await screen.findByText("Neu")).toBeInTheDocument();
  });

  it("löscht eine Task (DELETE) und entfernt sie aus der Liste", async () => {
    const task = { id: 5, taskName: "DeleteMe", done: false, important: false, category: "", color: "#0d6efd", date: null };

    (globalThis as any).fetch = mockFetchRouter([
      { match: (u, m) => m === "GET" && u.includes("/tasks"), handle: () => resJson([task]) },
      { match: (u, m) => m === "GET" && u.includes("/categories"), handle: () => resJson([]) },
      { match: (u, m) => m === "DELETE" && u.includes("/tasks/5"), handle: () => resText("", true, 204) },
    ]);

    await mountAndWait();

    expect(await screen.findByText("DeleteMe")).toBeInTheDocument();
    await fireEvent.click(screen.getByTitle("Task löschen"));

    await waitFor(() => expect(screen.queryByText("DeleteMe")).not.toBeInTheDocument());
  });

  it("toggle done sendet PATCH", async () => {
    const task = { id: 7, taskName: "X", done: false, important: false, category: "", color: "#0d6efd", date: null };

    const fetchMock = mockFetchRouter([
      { match: (u, m) => m === "GET" && u.includes("/tasks"), handle: () => resJson([task]) },
      { match: (u, m) => m === "GET" && u.includes("/categories"), handle: () => resJson([]) },

      // ✅ akzeptiere BEIDE Varianten:
      // 1) dein ursprünglicher Endpoint: /tasks/7/done?done=true
      { match: (u, m) => m === "PATCH" && u.includes("/tasks/7/done"), handle: () => resJson({}) },

      // 2) falls du stattdessen PATCH /tasks/7 verwendest (patchTask endpoint)
      { match: (u, m) => m === "PATCH" && u.includes("/tasks/7"), handle: () => resJson({}) },
    ]);

    (globalThis as any).fetch = fetchMock;

    await mountAndWait();

    await screen.findByText("X");
    await fireEvent.click(screen.getAllByRole("checkbox")[0]);

    await flushPromises();
    await nextTick();

    // ✅ wir prüfen jetzt auf "irgendein PATCH auf /tasks/7"
    expect(
      fetchMock.mock.calls.some((c) => String(c[0]).includes("/tasks/7") && String(c[1]?.method ?? "GET").toUpperCase() === "PATCH")
    ).toBe(true);
  });


  it("Suchleiste filtert Tasks nach Name", async () => {
    const t1 = { id: 1, taskName: "Uni lernen", done: false, important: false, category: "", color: "#0d6efd", date: null };
    const t2 = { id: 2, taskName: "Einkaufen", done: false, important: false, category: "", color: "#0d6efd", date: null };

    (globalThis as any).fetch = mockFetchRouter([
      { match: (u, m) => m === "GET" && u.includes("/tasks"), handle: () => resJson([t1, t2]) },
      { match: (u, m) => m === "GET" && u.includes("/categories"), handle: () => resJson([]) },
    ]);

    await mountAndWait();

    await screen.findByText("Uni lernen");
    await fireEvent.update(screen.getByPlaceholderText("Taskname eingeben…"), "Uni");
    await nextTick();

    expect(screen.getByText("Uni lernen")).toBeInTheDocument();
    expect(screen.queryByText("Einkaufen")).not.toBeInTheDocument();
  });

  it("Kalender zeigt Dots wenn Tasks ein Datum haben", async () => {
    const t = { id: 1, taskName: "Mit Datum", done: false, important: false, category: "", color: "#198754", date: "2026-01-10" };

    (globalThis as any).fetch = mockFetchRouter([
      { match: (u, m) => m === "GET" && u.includes("/tasks"), handle: () => resJson([t]) },
      { match: (u, m) => m === "GET" && u.includes("/categories"), handle: () => resJson([]) },
    ]);

    await mountAndWait();

    await screen.findByText("Mit Datum");
    expect(document.querySelector(".dot")).not.toBeNull();
  });

  it("zeigt Fehlermeldung wenn Tasks laden fehlschlägt", async () => {
    (globalThis as any).fetch = mockFetchRouter([
      { match: (u, m) => m === "GET" && u.includes("/tasks"), handle: () => resText("fail", false, 500) },
      { match: (u, m) => m === "GET" && u.includes("/categories"), handle: () => resJson([]) },
    ]);

    await mountAndWait();

    expect(await screen.findByText(/HTTP 500/i)).toBeInTheDocument();
  });
});
