import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const profile = await getCurrentUser();
  redirect(profile ? "/dashboard" : "/login");
}