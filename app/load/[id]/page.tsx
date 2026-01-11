"use client";
import { useParams } from "next/navigation";

export default function LoadDetailPage() {
  const params = useParams();
  ("use client");

  return <div>Load ID: {params.id}</div>;
}
