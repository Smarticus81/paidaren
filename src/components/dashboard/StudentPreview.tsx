"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function StudentPreview(props: {
  sessionId: string;
  activityName: string;
  assignmentText: string;
  briefContext: string;
  coachName: string;
  turnLimit: number;
  timerMinutes: number | null;
}) {
  const [phase, setPhase] = useState<"name" | "chat" | "complete">("name");
  const [studentName, setStudentName] = useState("");
  const [submittingName, setSubmittingName] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [turn, setTurn] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openingFetched = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

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

  async function handleNameSubmit() {
    if (!studentName.trim() || submittingName) return;
    setSubmittingName(true);
    try {
      const res = await fetch("/api/coach/set-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: props.sessionId, name: studentName.trim() }),
      });
      if (!res.ok) { setSubmittingName(false); return; }
      setPhase("chat");
      setSubmittingName(false);
      if (!openingFetched.current) {
        openingFetched.current = true;
        fetchOpening();
      }
    } catch {
      setSubmittingName(false);
    }
  }

  async function send() {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/coach/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: props.sessionId, content: userMsg }),
      });
      if (!res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let sessionEnding = false;

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
            }
          } catch {}
        }
      }
      if (sessionEnding) setPhase("complete");
    } catch {}
    setStreaming(false);
  }

  // ─── NAME ENTRY ──────────────────────────────
  if (phase === "name") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="bg-surface rounded-2xl border border-border p-8 max-w-md w-full mx-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mb-5">
            <span className="text-accent font-serif font-bold text-lg">S</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-accent font-semibold mb-3">
            {props.activityName}
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2 font-serif">Before we begin</h1>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            What should {props.coachName} call you? This name will appear throughout the session and on your report.
          </p>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleNameSubmit(); } }}
            placeholder="e.g. Marcus, Ms. Chen, Priya R."
            maxLength={80}
            autoFocus
            className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
            disabled={submittingName}
          />
          <button
            onClick={handleNameSubmit}
            disabled={!studentName.trim() || submittingName}
            className="w-full mt-4 bg-accent text-white py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {submittingName ? "Starting…" : `Begin session with ${props.coachName}`}
          </button>
        </div>
      </div>
    );
  }

  // ─── COMPLETED ───────────────────────────────
  if (phase === "complete") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="bg-surface rounded-2xl border border-border p-8 max-w-md w-full mx-4 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <span className="text-emerald-600 text-xl">✓</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2 font-serif">Session Complete</h1>
          <p className="text-sm text-muted mb-4">
            This is where the student would see their report download options.
          </p>
          <div className="flex gap-3 justify-center">
            <div className="bg-foreground text-surface px-5 py-2.5 rounded-xl text-sm font-medium opacity-50 cursor-not-allowed">
              PDF Report
            </div>
            <div className="border border-border text-foreground px-5 py-2.5 rounded-xl text-sm font-medium opacity-50 cursor-not-allowed">
              Word Report
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── CHAT ────────────────────────────────────
  const progress = props.turnLimit > 0 ? Math.min((turn / props.turnLimit) * 100, 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 grid lg:grid-cols-[280px_1fr] gap-4" style={{ height: "calc(100vh - 56px)" }}>
      {/* Sidebar — assignment */}
      <aside className="bg-surface rounded-2xl border border-border p-5 overflow-y-auto hidden lg:block">
        <div className="text-[10px] uppercase tracking-[0.2em] text-accent font-semibold mb-2">Assignment</div>
        <h2 className="text-base font-semibold text-foreground mb-4 font-serif">{props.activityName}</h2>
        <div className="text-xs text-muted leading-relaxed whitespace-pre-wrap mb-6">{props.assignmentText}</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-accent font-semibold mb-2">Scope</div>
        <div className="text-xs text-muted leading-relaxed">{props.briefContext}</div>
      </aside>

      {/* Chat panel */}
      <section className="bg-surface rounded-2xl border border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-accent font-serif font-bold text-sm">
                {props.coachName.charAt(0)}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{props.coachName}</div>
              <div className="text-[10px] text-muted">
                Turn {turn} of {props.turnLimit}
                {props.timerMinutes && ` · ${props.timerMinutes} min limit`}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2 text-sm text-muted">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                {props.coachName} is preparing a question…
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-accent text-white"
                    : "bg-background border border-border text-foreground"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider mb-1 opacity-50 font-medium">
                  {m.role === "user" ? studentName : props.coachName}
                </div>
                <div className="whitespace-pre-wrap">
                  {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
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
              placeholder="Type your analysis… Enter to send"
              className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none transition-all"
              rows={2}
              disabled={streaming}
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="bg-accent text-white px-5 rounded-xl text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity self-end h-10"
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
