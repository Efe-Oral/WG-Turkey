import { deleteTestUser } from "./auth";
import { adminDb } from "./env";

/**
 * A run that gets killed never reaches its cleanup, and its leftover listings
 * would mislead the next run. Test users all use example.com.
 */
export default async function globalSetup() {
  const { data } = await adminDb.auth.admin.listUsers({ perPage: 1000 });

  const leftovers = data.users.filter((user) =>
    user.email?.endsWith("@example.com"),
  );

  for (const user of leftovers) {
    await deleteTestUser(user.id);
  }
}
