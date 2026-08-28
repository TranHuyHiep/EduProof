"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStudent } from "@/lib/data";
import { getSessionStudentId } from "@/lib/session";
import type { Student } from "@/types";

/**
 * Resolves the signed-in student from the demo session.
 * Redirects to login when absent. `loading` covers the first client render,
 * since localStorage is unavailable during SSR.
 */
export function useStudent() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getSessionStudentId();
    const found = id ? getStudent(id) : undefined;
    if (!found) {
      router.replace("/student/login");
      return;
    }
    setStudent(found);
    setLoading(false);
  }, [router]);

  return { student, loading };
}
