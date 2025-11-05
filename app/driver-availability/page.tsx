"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DriverAvailabilityRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/driver/profile#availability");
  }, [router]);
  return null;
}