export const scienceSubjects = ["数学", "物理", "化学", "英语"] as const;

export type ScienceSubject = (typeof scienceSubjects)[number];

export function isScienceSubject(subject: string) {
  return scienceSubjects.includes(subject as ScienceSubject);
}
