"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { foldForSearch } from "@/lib/turkish";

type City = { name: string; slug: string };

type CityComboboxProps = {
  cities: City[];
  value?: string;
  onSelect: (slug: string) => void;
  className?: string;
};

/**
 * Text input over the 81 provinces. Free text never leaves this component: a
 * value only reaches the parent when it is picked from the list.
 */
export function CityCombobox({
  cities,
  value,
  onSelect,
  className,
}: CityComboboxProps) {
  const t = useTranslations("search");
  const id = useId();
  const listId = `${id}-list`;
  const selected = cities.find((city) => city.slug === value);

  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const shown = text ?? selected?.name ?? "";

  const matches = useMemo(() => {
    if (text === null || text === "") return cities;
    const query = foldForSearch(text);
    return cities.filter((city) => foldForSearch(city.name).startsWith(query));
  }, [cities, text]);

  const choose = (city: City) => {
    setText(null);
    setOpen(false);
    onSelect(city.slug);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const city = open ? matches[active] : undefined;
      if (city) choose(city);
    } else if (event.key === "Escape") {
      setOpen(false);
      setText(null);
    }
  };

  return (
    <div className={clsx("relative flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-meta font-semibold">
        {t("city")}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && matches[active] ? `${listId}-${active}` : undefined
        }
        autoComplete="off"
        value={shown}
        placeholder={t("cityPlaceholder")}
        onChange={(event) => {
          setText(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={(event) => {
          event.target.select();
          setOpen(true);
        }}
        // A text that was not picked from the list falls back to the last city.
        onBlur={() => {
          setOpen(false);
          setText(null);
        }}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-input border border-black/20 bg-white px-3 text-body placeholder:text-black/60"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={t("city")}
        hidden={!open}
        className="absolute top-full z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-card bg-white p-1 shadow-float"
      >
        {matches.map((city, index) => (
          <li
            key={city.slug}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={city.slug === value}
            // Fires before the input's blur, so the choice is not lost.
            onMouseDown={(event) => {
              event.preventDefault();
              choose(city);
            }}
            onMouseEnter={() => setActive(index)}
            className={clsx(
              "cursor-pointer rounded-input px-3 py-2",
              index === active && "bg-black/4",
            )}
          >
            {city.name}
          </li>
        ))}
        {matches.length === 0 ? (
          <li role="presentation" className="px-3 py-2 text-black/60">
            {t("noCity")}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
