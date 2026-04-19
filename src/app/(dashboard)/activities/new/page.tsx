import { ActivityForm } from "@/components/dashboard/ActivityForm";

export default function NewActivityPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl text-foreground mb-1">New Activity</h1>
      <p className="text-muted text-sm mb-8">
        Walk through each step to configure a coaching session for your students.
      </p>
      <div className="bg-surface border border-border rounded-xl p-8">
        <ActivityForm />
      </div>
    </div>
  );
}
