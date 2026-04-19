"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function CoachChat(props: {
  sessionId: string;
  activityName: string;
  assignmentText: string;
  briefContext: string;
  coachName: string;
  studentName: string | null;
  turnLimit: number;
  timerMinutes: number | null;
  initialTurnCount: number;
  initialMessages: Msg[];
  startedAt: string | null;
  alreadyCompleted: boolean;
  reportReady: boolean;
}) {
  const [studentName, setStudentName] = useState<string | null>(props.studentName);
  const [nameInput, setNameInput] = useState("");
  const [submittingName, setSubmittingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Msg[]>(
    props.initialMessages.length > 0 ? props.initialMessages : [],
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [turn, setTurn] = useState(props.initialTurnCount);
  const [completed, setCompleted] = useState(props.alreadyCompleted);
  const [reportReady, setReportReady] = useState(props.reportReady);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openingFetched = useRef(false);

  // Fetch the coach's opening question (based on the fact pattern)
  async function fetchOpening() {
    setStreaming(true);
    setMessages([{ role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/coach/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: props.sessionId }),
      });

      if (!res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token) {
              setMessages((m) => {
                const copy = [...m];
                copy[0] = { role: "assistant", content: copy[0].content + data.token };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch {}
    setStreaming(false);
  }

  // If session already has a name but no messages yet, fetch the opening
  useEffect(() => {
    if (studentName && messages.length === 0 && !completed && !openingFetched.current) {
      openingFetched.current = true;
      fetchOpening();
    }
  }, [studentName]);

  useEffect(() => {
    if (!props.timerMinutes || !props.startedAt || completed) return;
    const startMs = new Date(props.startedAt).getTime();
    const limitMs = props.timerMinutes * 60 * 1000;

    const tick = () => {
      const elapsed = Date.now() - startMs;
      const remaining = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0 && !completed) {
        endSession("TIMER");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [props.timerMinutes, props.startedAt, completed]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function send() {
    if (!input.trim() || streaming || completed) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setStreaming(true);

    const res = await fetch("/api/coach/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: props.sessionId, content: userMsg }),
    });

    if (!res.body) {
      setStreaming(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let sessionEnding = false;
    let endReason: string | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.token) {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + data.token };
              return copy;
            });
          }
          if (data.done) {
            setTurn(data.turnCount);
            sessionEnding = data.sessionEnding;
            endReason = data.endReason;
          }
        } catch {}
      }
    }
    setStreaming(false);

    if (sessionEnding && endReason) {
      await endSession(endReason as "TURN_LIMIT" | "TIMER");
    }
  }

  async function endSession(reason: "TURN_LIMIT" | "TIMER" | "STUDENT_ENDED") {
    setCompleted(true);
    const res = await fetch("/api/coach/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: props.sessionId, endReason: reason }),
    });
    const data = await res.json();
    if (data.reportReady) setReportReady(true);
  }

  const timerDisplay =
    remainingSeconds !== null
      ? `${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, "0")}`
      : null;

  async function submitName() {
    const trimmed = nameInput.trim();
    if (!trimmed || submittingName) return;
    setSubmittingName(true);
    setNameError(null);

    try {
      const res = await fetch("/api/coach/set-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: props.sessionId, name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(data.error ?? "Could not save your name. Please try again.");
        setSubmittingName(false);
        return;
      }
      setStudentName(data.studentName);
      setSubmittingName(false);
      // The useEffect on studentName will trigger fetchOpening
    } catch (err) {
      setNameError("Network error. Please try again.");
      setSubmittingName(false);
    }
  }

  // ─── NAME-ENTRY SCREEN ─────────────────────────────────────
  if (!studentName && !completed) {
    return (
      <div className="max-w-xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-xs uppercase tracking-widest text-amber-700 font-bold mb-2">
            {props.activityName}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Before we begin</h1>
          <p className="text-slate-700 mb-6 leading-relaxed">
            What should the coach call you? Enter whatever name or form of
            address you&apos;d like {props.coachName} to use throughout the session.
            This name will also appear on the document you download at the end.
          </p>
          <label htmlFor="student-name" className="block text-sm font-semibold text-slate-900 mb-2">
            Your name <span className="text-amber-700">*</span>
          </label>
          <input
            id="student-name"
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitName();
              }
            }}
            maxLength={80}
            autoFocus
            placeholder="e.g. Marcus, Ms. Chen, Priya R."
            className="w-full border-2 border-slate-300 rounded-lg px-4 py-3 text-base focus:border-slate-900 outline-none"
            disabled={submittingName}
          />
          {nameError && (
            <div className="text-sm text-red-700 mt-2">{nameError}</div>
          )}
          <button
            onClick={submitName}
            disabled={!nameInput.trim() || submittingName}
            className="w-full mt-6 bg-slate-900 text-white py-3 rounded-lg font-semibold disabled:opacity-40"
          >
            {submittingName ? "Starting…" : `Start session with ${props.coachName}`}
          </button>
          <p className="text-xs text-slate-500 mt-4">
            Once the session starts, the coach will address you by this name.
            You can&apos;t change it mid-session.
          </p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-xs uppercase tracking-widest text-amber-700 font-bold mb-2">Session Complete</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">{props.activityName}</h1>
          {reportReady ? (
            <>
              <p className="text-slate-700 mb-6">
                Your session is complete. Download your combined transcript and reasoning analysis below.
              </p>
              <div className="flex gap-4 justify-center">
                <a
                  href={`/api/report/${props.sessionId}/pdf`}
                  className="bg-slate-900 text-white px-6 py-2 rounded-full font-semibold"
                >
                  Download as PDF
                </a>
                <a
                  href={`/api/report/${props.sessionId}/docx`}
                  className="bg-white text-slate-900 border-2 border-slate-900 px-6 py-2 rounded-full font-semibold"
                >
                  Download as Word
                </a>
              </div>
            </>
          ) : (
            <p className="text-slate-700">Generating your reasoning analysis… this takes a few seconds.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 grid md:grid-cols-[1fr_2fr] gap-4 h-screen">
      <aside className="bg-white rounded-lg shadow p-6 overflow-y-auto">
        <div className="text-xs uppercase tracking-wider text-amber-700 font-bold mb-1">Assignment</div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">{props.activityName}</h2>
        <div className="text-sm text-slate-700 whitespace-pre-wrap mb-6">{props.assignmentText}</div>
        <div className="text-xs uppercase tracking-wider text-amber-700 font-bold mb-1">Context</div>
        <div className="text-sm text-slate-700 whitespace-pre-wrap">{props.briefContext}</div>
      </aside>

      <section className="bg-white rounded-lg shadow flex flex-col">
        <div className="border-b px-6 py-3 flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-900">{props.coachName}</div>
            <div className="text-xs text-slate-500">
              Turn {turn} / {props.turnLimit}
              {timerDisplay && `  ·  ${timerDisplay}`}
            </div>
          </div>
          <button
            onClick={() => endSession("STUDENT_ENDED")}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            End session
          </button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div
                className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
                  m.role === "user" ? "bg-slate-900 text-white" : "bg-amber-50 text-slate-900"
                }`}
              >
                <div className="text-xs uppercase tracking-wider mb-1 opacity-70">
                  {m.role === "user" ? studentName : props.coachName}
                </div>
                <div className="whitespace-pre-wrap text-sm">
                  {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type your analysis… Enter to send, Shift+Enter for newline"
              className="flex-1 border rounded px-3 py-2 text-sm resize-none"
              rows={3}
              disabled={streaming}
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="bg-slate-900 text-white px-6 rounded font-semibold disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
