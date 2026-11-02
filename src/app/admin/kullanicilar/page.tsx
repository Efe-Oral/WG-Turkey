import { getTranslations } from "next-intl/server";
import { UserRow } from "@/components/admin/AdminRows";
import { searchUsers } from "@/lib/admin/queries";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UsersPage({ searchParams }: PageProps) {
  const [params, t] = await Promise.all([searchParams, getTranslations("admin")]);
  const query = typeof params.q === "string" ? params.q : "";
  const users = await searchUsers(query);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-semibold">{t("usersTitle")}</h1>
      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          aria-label={t("usersSearch")}
          placeholder={t("usersSearch")}
          className="h-10 w-full max-w-md rounded-input border border-black/20 bg-white px-3 placeholder:text-black/60"
        />
        <button
          type="submit"
          className="h-10 cursor-pointer rounded-pill bg-graphite px-6 font-bold text-white hover:brightness-[.94]"
        >
          {t("search")}
        </button>
      </form>
      {users.length === 0 ? <p>{t("usersEmpty")}</p> : null}
      <ul className="flex flex-col gap-3">
        {users.map((user) => (
          <li key={user.id}>
            <UserRow user={user} />
          </li>
        ))}
      </ul>
    </div>
  );
}
