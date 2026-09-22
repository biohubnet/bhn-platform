import { redirect } from "next/navigation";

// The feature switcher was removed (design review, Sep 2026). Old links land on the profile.
export default function PreferencesPage() {
  redirect("/profile");
}
