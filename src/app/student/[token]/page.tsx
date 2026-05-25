import { notFound } from "next/navigation";
import { StudentPortal } from "@/components/student-portal";
import { getStudentByAccessToken } from "@/lib/student-access";

export const dynamic = "force-dynamic";

export default async function StudentPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const access = await getStudentByAccessToken(token);
  if (!access) notFound();

  const latestPlan = access.student.studyPlans[0] || null;

  return (
    <StudentPortal
      token={token}
      student={{
        name: access.student.name,
        grade: access.student.grade,
        weakPoints: access.student.weakPoints,
      }}
      latestPlan={latestPlan ? JSON.parse(JSON.stringify(latestPlan)) : null}
      wrongQuestions={JSON.parse(JSON.stringify(access.student.wrongQuestions))}
    />
  );
}
