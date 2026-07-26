import { redirect } from "next/navigation";

/** Email designer moved to Marketing → Design. */
export default function EmailSettingsRedirectPage() {
  redirect("/marketing/design/email");
}
