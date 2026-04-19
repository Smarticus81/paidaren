"use client";
import { useState } from "react";

type PickerActivity = {
  id: string;
  name: string;
  subjectTag: string;
  briefContext: string;
  rigor: string;
};

export function ActivityPicker(props: {
  activities: PickerActivity[];
  platformId: string;
  deploymentId: string;
  returnUrl: string;
  data: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSelect(activityId: string) {
    setSelected(activityId);
    setSubmitting(true);

    const res = await fetch("/api/lti/deeplink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformId: props.platformId,
        activityId,
        deploymentId: props.deploymentId,
        returnUrl: props.returnUrl,
        data: props.data,
      }),
    });

    if (res.ok) {
      const html = await res.text();
      document.open();
      document.write(html);
      document.close();
    } else {
      setSubmitting(false);
      setSelected(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-xs uppercase tracking-widest text-amber-700 font-bold mb-2">
        SOCRATES
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Select an Activity</h1>
      <p className="text-slate-600 mb-6">
        Choose which Socratic coaching activity to add to this course.
      </p>

      {props.activities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-slate-600">
            No published activities available. Create and publish an activity in the Socrates dashboard first.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {props.activities.map((a) => (
            <button
              key={a.id}
              onClick={() => handleSelect(a.id)}
              disabled={submitting}
              className={`w-full text-left bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow border-2 ${
                selected === a.id ? "border-amber-700" : "border-transparent"
              } disabled:opacity-50`}
            >
              <div className="font-semibold text-slate-900">{a.name}</div>
              <div className="text-sm text-slate-600 mt-1">{a.briefContext}</div>
              <div className="flex gap-3 text-xs text-slate-500 mt-2">
                <span>{a.subjectTag}</span>
                <span>{a.rigor}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
