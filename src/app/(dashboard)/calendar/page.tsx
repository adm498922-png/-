import { redirect } from "next/navigation";
import { hidesGonggu } from "@/lib/app-mode";
import CalendarPage from "./CalendarPage";

export default function Page() {
  if (hidesGonggu()) redirect("/");
  return <CalendarPage />;
}
