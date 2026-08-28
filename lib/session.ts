// Demo-only session: a student id in localStorage.
// Not authentication — there is no secret, no token and no verification.

const STUDENT_KEY = "eduproof.session.studentId";
const SCHOOL_KEY = "eduproof.session.schoolId";

const read = (k: string) => (typeof window === "undefined" ? null : window.localStorage.getItem(k));
const write = (k: string, v: string) => {
  try { window.localStorage.setItem(k, v); } catch {}
};
const drop = (k: string) => {
  try { window.localStorage.removeItem(k); } catch {}
};

export const getSessionStudentId = () => read(STUDENT_KEY);
export const setSessionStudentId = (id: string) => write(STUDENT_KEY, id);
export const getSessionSchoolId = () => read(SCHOOL_KEY);
export const setSessionSchoolId = (id: string) => write(SCHOOL_KEY, id);
export const clearSession = () => { drop(STUDENT_KEY); drop(SCHOOL_KEY); };
