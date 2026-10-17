"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { eventSchema, occurrences, type EventConfig } from "@/lib/events";
const storageKey = "lunar-todoist-event-v1";
export function Planner({
  connected,
  configured,
}: {
  connected: boolean;
  configured: boolean;
}) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return ready ? (
    <PlannerForm connected={connected} configured={configured} />
  ) : (
    <main className="p-6">Loading planner…</main>
  );
}
const subscribe = () => () => {};
function load() {
  const initial = {
    event: {
      id: crypto.randomUUID(),
      title: "Birthday",
      month: 10,
      day: 1,
      leap: false,
      count: 5,
      from: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    },
    known: {} as Record<string, string>,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved)
      return {
        event: eventSchema.parse(saved.event),
        known: saved.known || {},
      };
  } catch {}
  return initial;
}
function PlannerForm({
  connected,
  configured,
}: {
  connected: boolean;
  configured: boolean;
}) {
  const [initial] = useState(load);
  const [event, setEvent] = useState<EventConfig>(initial.event);
  const [known, setKnown] = useState<Record<string, string>>(initial.known);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = true;
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ event, known }));
    } catch {
      /* Browser may disable persistent storage. */
    }
  }, [event, known]);
  let dates: string[] = [];
  let error = "";
  if (ready)
    try {
      dates = occurrences(event);
    } catch (e) {
      error = (e as Error).message;
    }
  async function sync() {
    setBusy(true);
    setStatus("Working…");
    try {
      const r = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, known }),
      });
      const data = await r.json();
      if (data.known) setKnown(data.known);
      if (!r.ok) throw new Error(data.error);
      setStatus(
        `Created ${data.created}; updated ${data.updated}. Completed or removed tasks are left alone.`,
      );
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-sm font-medium text-orange-700">
        农历 · Chinese Lunar Calendar for Todoist
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">
        Lunar dates. Concrete plans.
      </h1>
      <p className="mt-4 text-neutral-600">
        Preview a finite set of Gregorian dates, then send ordinary,
        non-recurring tasks to Todoist. Come back to update unfinished tasks.
      </p>
      <div className="mt-6">
        {connected ? (
          <Button
            variant="outline"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              location.reload();
            }}
          >
            Disconnect Todoist
          </Button>
        ) : configured ? (
          <a className="underline" href="/api/auth/login">
            Connect Todoist
          </a>
        ) : (
          <p className="rounded-md bg-amber-50 p-3 text-sm">
            Preview is ready. The owner must configure Todoist OAuth before
            connecting.
          </p>
        )}
      </div>
      <form
        className="mt-8 grid grid-cols-2 gap-5 rounded-xl border p-6"
        onSubmit={(e) => {
          e.preventDefault();
          sync();
        }}
      >
        <label className="col-span-2">
          Event title
          <input
            className="mt-1 w-full rounded border p-2"
            value={event.title}
            maxLength={200}
            onChange={(e) => setEvent({ ...event, title: e.target.value })}
          />
        </label>
        {(["month", "day", "count"] as const).map((key) => (
          <label key={key} className="capitalize">
            {key}
            <input
              className="mt-1 w-full rounded border p-2"
              type="number"
              min={1}
              max={key === "month" ? 12 : key === "day" ? 30 : 20}
              value={event[key]}
              onChange={(e) =>
                setEvent({ ...event, [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
        <label>
          Starting from
          <input
            className="mt-1 w-full rounded border p-2"
            type="date"
            value={event.from}
            onChange={(e) => setEvent({ ...event, from: e.target.value })}
          />
        </label>
        <label className="col-span-2 flex gap-2">
          <input
            type="checkbox"
            checked={event.leap}
            onChange={(e) => setEvent({ ...event, leap: e.target.checked })}
          />
          Leap month only
        </label>
        <p className="col-span-2 text-sm text-neutral-500">
          Missing leap months and day 30 are skipped. Dates use the Chinese
          calendar. Search ends at lunar year 2100. Reducing the count does not
          delete existing tasks.
        </p>
        <Button
          className="col-span-2"
          type="submit"
          disabled={!ready || !connected || busy || !!error || !dates.length}
        >
          Create / update Todoist tasks
        </Button>
      </form>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Gregorian preview</h2>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <ol className="mt-3 grid gap-2">
            {dates.map((d, i) => (
              <li
                className="flex justify-between rounded border px-4 py-3"
                key={d}
              >
                <span>Occurrence {i + 1}</span>
                <time dateTime={d}>{d}</time>
              </li>
            ))}
          </ol>
        )}
        {ready && dates.length < event.count && !error && (
          <p>Only {dates.length} occurrences found before 2101.</p>
        )}
      </section>
      <p className="mt-5" role="status">
        {status}
      </p>
      <p className="mt-8 text-sm text-neutral-500">
        Settings and task IDs stay in this browser. Keep this browser data to
        update the same tasks later. No database, background jobs, or automatic
        renewal. Disconnect clears this app’s session; revoke app access in
        Todoist to revoke its token.
      </p>
    </main>
  );
}
