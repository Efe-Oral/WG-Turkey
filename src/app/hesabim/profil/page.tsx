import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/account/ProfileForm";
import { getViewer } from "@/lib/auth/viewer";

export default async function ProfilePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");

  return (
    <ProfileForm
      userId={viewer.id}
      profile={viewer.profile}
      phone={viewer.profile.phone}
    />
  );
}
