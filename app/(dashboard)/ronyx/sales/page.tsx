import { redirect } from "next/navigation";
// Sales is a MoveAround (product) function, not a Ronyx tenant one — it lives in HQ now.
export default function RonyxSalesRedirect() {
  redirect("/hq/sales");
}
