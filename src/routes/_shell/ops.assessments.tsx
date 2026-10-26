import { createFileRoute } from "@tanstack/react-router";
import { AssessmentStudioWorkspace } from "@/components/assessment/AssessmentStudioWorkspace";

export const Route = createFileRoute("/_shell/ops/assessments")({
  head: () => ({
    meta: [
      { title: "Assessments & Transformation Studio · SWEAT" },
      { name: "description", content: "Dual-device Assessment & Transformation Studio in SWEAT operating system." },
      { property: "og:title", content: "Assessments & Transformation Studio · SWEAT" },
      { property: "og:description", content: "Dual-device Assessment & Transformation Studio in SWEAT operating system." },
    ],
  }),
  component: () => <AssessmentStudioWorkspace />,
});
