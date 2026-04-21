import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@paidaren.com" },
    update: {},
    create: {
      email: "demo@paidaren.com",
      name: "Demo ID",
      emailVerified: new Date(),
      role: "INSTRUCTIONAL_DESIGNER",
    },
  });

  // Ensure the platform owner is always an enabled admin.
  await prisma.user.upsert({
    where: { email: "hazvimusoni@gmail.com" },
    update: { role: "ADMIN", disabled: false },
    create: {
      email: "hazvimusoni@gmail.com",
      name: "Hazvi Musoni",
      emailVerified: new Date(),
      role: "ADMIN",
    },
  });

  await prisma.activity.upsert({
    where: { id: "demo-negligence-activity" },
    update: {},
    create: {
      id: "demo-negligence-activity",
      name: "Negligence Analysis — Henderson v. Pacific Motors",
      subjectTag: "Tort Law",
      assignmentText: `On March 15, 2024, Sarah Henderson drove her 2019 Honda Civic to Pacific Motors, a full-service auto repair shop, for a routine brake inspection. The shop's service advisor, Tom Reeves, assured her that their ASE-certified technicians would thoroughly inspect the braking system.

The technician assigned to the job, Mike Chen, had been working double shifts for two weeks due to staff shortages. During the inspection, Chen noted that the rear brake pads were worn to 2mm (the manufacturer's minimum safe threshold is 3mm) but marked them as "within acceptable range" on the inspection report. He did not inspect the brake fluid level or test the brake lines, both of which were required steps on Pacific Motors' standard brake inspection checklist.

Three days later, Henderson was driving on a steep downhill road at 35 mph in a 35 mph zone when she applied her brakes approaching a red light. The brakes failed to engage fully. Henderson's car rear-ended a stopped vehicle driven by Marcus Cole at approximately 20 mph. Cole sustained a herniated disc (L4-L5) requiring surgery, $47,000 in medical bills, and missed eight weeks of work as a construction foreman earning $1,200/week.

Henderson's vehicle was subsequently inspected by an independent mechanic, who found: (1) rear brake pads worn to 0.5mm, (2) brake fluid below minimum operating level, and (3) a small crack in the left rear brake line that was leaking fluid. The independent mechanic stated that conditions (2) and (3) "would have been visible during any competent brake inspection."

Pacific Motors' employee handbook requires all brake inspections to follow a 12-point checklist. The shop's records show that Chen completed only 4 of the 12 checklist items. Pacific Motors does not carry professional liability insurance and has had two prior OSHA citations for requiring technicians to work more than 60 hours per week.`,
      briefContext: "Foundations of tort law — negligence analysis",
      rigor: "STANDARD",
      focusInstructions: null,
      turnLimit: 10,
      timerMinutes: null,
      attemptsAllowed: 3,
      coachName: "Professor Cardozo",
      coachTone: "FORMAL",
      published: true,
      createdById: user.id,
    },
  });

  console.log("Seed complete: demo user + negligence activity created.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
