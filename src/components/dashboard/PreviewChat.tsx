"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function PreviewChat(props: {
  sessionId: string;
  coachName: string;
  studentName: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [turn, setTurn] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openingFetched = useRef(false);

  // Fetch the coach's opening question on mount
  useEffect(() => {
    if (openingFetched.current) return;
    openingFetched.current = true;

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

    fetchOpening();
  }, [props.sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function send() {
    if (!input.trim() || streaming) return;
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
              copy[copy.length - 1] = {
                role: "assistant",
                content: copy[copy.length - 1].content + data.token,
              };
              return copy;
            });
          }
          if (data.done) setTurn(data.turnCount);
        } catch {}
      }
    }
    setStreaming(false);
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden flex flex-col bg-surface" style={{ height: 420 }}>
      <div className="border-b border-border px-5 py-3 flex items-center justify-between bg-background">
        <div className="text-sm font-medium text-foreground">{props.coachName}</div>
        <div className="text-xs text-muted">Turn {turn} &middot; Preview</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted text-center mt-16">
            The coach is preparing an opening question&hellip;
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={`rounded-lg px-4 py-2.5 max-w-[85%] text-sm ${
                m.role === "user"
                  ? "bg-accent text-white"
                  : "bg-background border border-border text-foreground"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider mb-1 opacity-60">
                {m.role === "user" ? props.studentName : props.coachName}
              </div>
              <div className="whitespace-pre-wrap">
                {m.content || (streaming && i === messages.length - 1 ? "\u2026" : "")}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type something to test the coach\u2026"
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-surface text-foreground placeholder:text-muted focus:border-accent outline-none"
            disabled={streaming}
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="bg-accent text-white px-4 rounded-lg text-sm font-medium disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
