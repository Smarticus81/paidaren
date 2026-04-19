"use client";
import { useRef, useState } from "react";
import type { Activity } from "@/generated/prisma/client";
import { saveDraftAndTest, finishActivity } from "@/app/(dashboard)/actions";
import { PreviewChat } from "./PreviewChat";

const STEPS = [
  { key: "basics", label: "Basics", description: "Name your activity and choose a subject." },
  { key: "assignment", label: "Assignment", description: "Provide the material students will analyze." },
  { key: "coach", label: "Coach", description: "Shape the coach's personality and behavior." },
  { key: "rules", label: "Session Rules", description: "Set boundaries for each session." },
  { key: "preview", label: "Try It", description: "Test the coaching experience before saving." },
] as const;

const RIGOR_INFO: Record<string, { label: string; hint: string }> = {
  INTRODUCTORY: { label: "Introductory", hint: "Gentle scaffolding. Patient follow-ups. Great for beginners." },
  STANDARD: { label: "Standard", hint: "Balanced probing. Challenges weak claims. The default for most courses." },
  RIGOROUS: { label: "Rigorous", hint: "Presses hard. Low tolerance for vague answers. Demands evidence." },
  EXAM_LEVEL: { label: "Exam Level", hint: "Simulates a real examiner. Ruthless on gaps. For advanced students." },
};

const TONE_INFO: Record<string, { label: string; hint: string }> = {
  FORMAL: { label: "Formal", hint: "Professional register. Precise terminology." },
  CONVERSATIONAL: { label: "Conversational", hint: "Warmer phrasing, contractions. Still rigorous." },
  EXAM_STYLE: { label: "Exam Style", hint: "Terse, direct. Short questions, minimal affect." },
};

const inputClass =
  "w-full border border-border rounded-lg px-4 py-3 text-sm bg-surface text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors";

const labelClass = "block text-sm font-medium text-foreground mb-1.5";
const hintClass = "text-xs text-muted mb-2";

export function ActivityForm(props: { activity?: Activity }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [selectedRigor, setSelectedRigor] = useState(props.activity?.rigor ?? "STANDARD");
  const [selectedTone, setSelectedTone] = useState(props.activity?.coachTone ?? "FORMAL");
  const [savedActivityId, setSavedActivityId] = useState<string | null>(props.activity?.id ?? null);
  const [previewState, setPreviewState] = useState<{
    sessionId: string;
    coachName: string;
    studentName: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirst = step === 0;
  const isPreview = step === 4;
  const isLastConfig = step === 3;

  function next() {
    if (step < 3) setStep(step + 1);
  }
  function back() {
    if (step === 0) return;
    if (step === 4) setPreviewState(null);
    setStep(step - 1);
  }

  async function handleLaunchPreview() {
    if (!formRef.current) return;
    setPreviewLoading(true);
    setError(null);
    try {
      const fd = new FormData(formRef.current);
      const result = await saveDraftAndTest(savedActivityId, fd);
      setSavedActivityId(result.activityId);
      setPreviewState({
        sessionId: result.sessionId,
        coachName: result.coachName,
        studentName: result.studentName,
      });
      setStep(4);
    } catch {
      setError("Please fill in all required fields before previewing.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSave() {
    if (!formRef.current || !savedActivityId) return;
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData(formRef.current);
      await finishActivity(savedActivityId, fd);
    } catch {
      setError("Could not save. Please check all fields and try again.");
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              if (i <= 3) {
                if (step === 4) setPreviewState(null);
                setStep(i);
              } else if (i === 4 && previewState) {
                setStep(i);
              }
            }}
            className="flex items-center gap-1 group"
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i === step
                  ? "bg-accent text-white"
                  : i < step
                  ? "bg-accent-light text-accent"
                  : "bg-background text-muted border border-border"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs hidden sm:inline transition-colors ${
                i === step ? "text-foreground font-medium" : "text-muted"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-px mx-1 ${
                  i < step ? "bg-accent-light" : "bg-border"
                }`}
              />
            )}
          </button>
        ))}
      </div>

      {/* Step header */}
      <div className="mb-6">
        <h3 className="text-lg text-foreground">{STEPS[step].description}</h3>
      </div>

      {/* Step: Basics */}
      <div className={step === 0 ? "space-y-5" : "hidden"}>
        <div>
          <label htmlFor="name" className={labelClass}>Activity Name</label>
          <input
            id="name" name="name" type="text"
            defaultValue={props.activity?.name ?? ""}
            required maxLength={200}
            placeholder="e.g. Negligence Hypothetical #3"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="subjectTag" className={labelClass}>Subject</label>
          <p className={hintClass}>A short tag that groups related activities.</p>
          <input
            id="subjectTag" name="subjectTag" type="text"
            defaultValue={props.activity?.subjectTag ?? ""}
            required maxLength={100}
            placeholder="e.g. Tort Law, Career Development, Ethics"
            className={inputClass}
          />
        </div>
      </div>

      {/* Step: Assignment */}
      <div className={step === 1 ? "space-y-5" : "hidden"}>
        <div>
          <label htmlFor="assignmentText" className={labelClass}>Assignment Text</label>
          <p className={hintClass}>
            The full scenario, fact pattern, or prompt the student will work through. Paste it in full.
          </p>
          <textarea
            id="assignmentText" name="assignmentText"
            defaultValue={props.activity?.assignmentText ?? ""}
            required rows={10}
            placeholder="Paste the assignment, fact pattern, or prompt here…"
            className={inputClass + " resize-y"}
          />
        </div>
        <div>
          <label htmlFor="briefContext" className={labelClass}>Scope</label>
          <p className={hintClass}>
            A short phrase defining the lane the coach operates in. This is not a summary of the assignment —
            it tells the coach where to stay.
          </p>
          <input
            id="briefContext" name="briefContext" type="text"
            defaultValue={props.activity?.briefContext ?? ""}
            required maxLength={500}
            placeholder="e.g. Elder Law client intake, Career goals 3.5-year plan"
            className={inputClass}
          />
        </div>
      </div>

      {/* Step: Coach */}
      <div className={step === 2 ? "space-y-6" : "hidden"}>
        <div>
          <label htmlFor="coachName" className={labelClass}>Coach Name</label>
          <p className={hintClass}>The name the coach uses to introduce itself.</p>
          <input
            id="coachName" name="coachName" type="text"
            defaultValue={props.activity?.coachName ?? "Socrates"}
            required maxLength={100}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Rigor Level</label>
          <p className={hintClass}>How hard should the coach push?</p>
          <input type="hidden" name="rigor" value={selectedRigor} />
          <div className="grid sm:grid-cols-2 gap-2">
            {Object.entries(RIGOR_INFO).map(([key, { label, hint }]) => (
              <button
                key={key} type="button"
                onClick={() => setSelectedRigor(key as any)}
                className={`text-left p-3.5 rounded-lg border text-sm transition-colors ${
                  selectedRigor === key
                    ? "border-accent bg-accent-light"
                    : "border-border bg-surface hover:border-muted"
                }`}
              >
                <div className="font-medium text-foreground">{label}</div>
                <div className="text-xs text-muted mt-0.5">{hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Tone</label>
          <input type="hidden" name="coachTone" value={selectedTone} />
          <div className="grid sm:grid-cols-3 gap-2">
            {Object.entries(TONE_INFO).map(([key, { label, hint }]) => (
              <button
                key={key} type="button"
                onClick={() => setSelectedTone(key as any)}
                className={`text-left p-3.5 rounded-lg border text-sm transition-colors ${
                  selectedTone === key
                    ? "border-accent bg-accent-light"
                    : "border-border bg-surface hover:border-muted"
                }`}
              >
                <div className="font-medium text-foreground">{label}</div>
                <div className="text-xs text-muted mt-0.5">{hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="focusInstructions" className={labelClass}>Focus Instructions <span className="text-muted">(optional)</span></label>
          <p className={hintClass}>
            Additional guidance to sharpen the coach. For example: &quot;Focus heavily on duty of care analysis&quot;
            or &quot;Require the student to cite specific facts before moving on.&quot;
          </p>
          <textarea
            id="focusInstructions" name="focusInstructions"
            defaultValue={props.activity?.focusInstructions ?? ""}
            rows={3}
            placeholder="Any extra instructions to sharpen the coach's behavior…"
            className={inputClass + " resize-y"}
          />
        </div>
      </div>

      {/* Step: Session Rules */}
      <div className={step === 3 ? "space-y-5" : "hidden"}>
        <div>
          <label htmlFor="turnLimit" className={labelClass}>Conversation Length</label>
          <p className={hintClass}>How many back-and-forth turns before the session ends? (6–20)</p>
          <input
            id="turnLimit" name="turnLimit" type="number"
            min={6} max={20}
            defaultValue={props.activity?.turnLimit ?? 10}
            required
            className={inputClass + " max-w-30"}
          />
        </div>

        <div>
          <label htmlFor="timerMinutes" className={labelClass}>Time Limit</label>
          <p className={hintClass}>Optional. The session ends when time runs out, even if turns remain.</p>
          <select
            id="timerMinutes" name="timerMinutes"
            defaultValue={props.activity?.timerMinutes?.toString() ?? ""}
            className={inputClass + " max-w-45"}
          >
            <option value="">No time limit</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </div>

        <div>
          <label htmlFor="attemptsAllowed" className={labelClass}>Attempts Allowed</label>
          <p className={hintClass}>How many times can a student start a fresh session for this activity?</p>
          <select
            id="attemptsAllowed" name="attemptsAllowed"
            defaultValue={props.activity?.attemptsAllowed?.toString() ?? "1"}
            className={inputClass + " max-w-45"}
          >
            <option value="1">1 attempt</option>
            <option value="3">3 attempts</option>
            <option value="5">5 attempts</option>
            <option value="1000">Unlimited</option>
          </select>
        </div>
      </div>

      {/* Step: Preview */}
      <div className={step === 4 ? "" : "hidden"}>
        {previewState ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              This is a live preview. Have a few exchanges to check that the tone, rigor, and focus
              feel right. Go back to adjust, or save when you&apos;re satisfied.
            </p>
            <PreviewChat
              key={previewState.sessionId}
              sessionId={previewState.sessionId}
              coachName={previewState.coachName}
              studentName={previewState.studentName}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="animate-pulse text-muted">Preparing preview\u2026</div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
        <button
          type="button"
          onClick={back}
          className={`text-sm text-muted hover:text-foreground transition-colors ${isFirst ? "invisible" : ""}`}
        >
          ← {isPreview ? "Back & adjust" : "Back"}
        </button>

        <div className="flex gap-3">
          {step < 3 && (
            <button
              type="button"
              onClick={next}
              className="bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Continue →
            </button>
          )}
          {isLastConfig && (
            <button
              type="button"
              onClick={handleLaunchPreview}
              disabled={previewLoading}
              className="bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {previewLoading ? "Saving\u2026" : "Try It →"}
            </button>
          )}
          {isPreview && previewState && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving\u2026" : "Save Activity ✓"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
