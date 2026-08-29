"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCredential, getWalletAddress } from "@/lib/session";
import { toDegree } from "@/lib/school-api";
import type { Student } from "@/types";

/**
 * Reconstructs the Student view model from the device-local credential.
 *
 * The credential is the only source of attributes — nothing is read from a
 * bundled JSON file, and nothing is fetched from the EduProof backend.
 * Redirects to login when the device holds no credential.
 */
export function useStudent() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const credential = getCredential();
    const wallet = getWalletAddress();

    if (!credential || !wallet) {
      router.replace("/student/login");
      return;
    }

    const { attributes: a } = credential;
    setStudent({
      id: credential.subject,
      schoolId: credential.issuer.schoolId,
      // The wallet stands in for a name — EduProof has no reason to know one.
      name: wallet,
      status: a.status.toLowerCase() as Student["status"],
      gpaScaled: a.gpaScaled,
      academicYear: a.academicYear,
      degree: toDegree(a.degree),
      major: a.major,
      enrolledAt: credential.issuedAt,
      expiresAt: credential.expiresAt,
    });
    setLoading(false);
  }, [router]);

  return { student, loading };
}
