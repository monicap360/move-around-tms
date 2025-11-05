"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DriverScheduleRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/driver/profile#schedule");
  }, [router]);
  return null;
}