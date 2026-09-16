"use client";

import { useEffect, useMemo, useState } from "react";
import { LeadStory } from "@/components/LeadStory";
import { StoryList } from "@/components/StoryList";
import { StoryRail } from "@/components/StoryRail";
import {
  DEFAULT_PER_SOURCE,
  DEFAULT_WINDOW_HOURS,
  PER_SOURCE_OPTIONS,
  WINDOW_OPTIONS,
} from "@/lib/config";
import type { DigestItem } from "@/lib/digest";
import { viewItems } from "@/lib/filter";
import { splitHome } from "@/lib/home";

type ExplorerState = {
  q: string;
  sources: string[];
  hours: number;
  perSource: number;
};

const DEFAULTS: ExplorerState = {
  q: "",
  sources: [],
  hours: DEFAULT_WINDOW_HOURS,
  perSource: DEFAULT_PER_SOURCE,
};

const STORAGE_KEY = "tel:view";

function pickOption(raw: string | null, options: number[]) {
  const value = Number(raw);
  return options.includes(value) ? value : null;
}

function readStored() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { hours?: number; perSource?: number }) : null;
  } catch {
    return null;
  }
}

/** Sıra: URL → localStorage → varsayılan. */
function readInitialState(): ExplorerState {
  if (typeof window === "undefined") return DEFAULTS;

  const params = new URLSearchParams(window.location.search);
  const stored = readStored();
  const storedHours =
    stored?.hours != null && WINDOW_OPTIONS.includes(stored.hours) ? stored.hours : null;
  const storedPerSource =
    stored?.perSource != null && PER_SOURCE_OPTIONS.includes(stored.perSource)
      ? stored.perSource
      : null;

  return {
    q: params.get("q") ?? "",
    sources: (params.get("kaynak") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    hours: pickOption(params.get("zaman"), WINDOW_OPTIONS) ?? storedHours ?? DEFAULTS.hours,
    perSource:
      pickOption(params.get("kaynakbasi"), PER_SOURCE_OPTIONS) ??
      storedPerSource ??
      DEFAULTS.perSource,
  };
}

function persist(state: ExplorerState) {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.sources.length > 0) params.set("kaynak", state.sources.join(","));
  if (state.hours !== DEFAULTS.hours) params.set("zaman", String(state.hours));
  if (state.perSource !== DEFAULTS.perSource) params.set("kaynakbasi", String(state.perSource));

  const search = params.toString();
  const url = search ? window.location.pathname + "?" + search : window.location.pathname;
  window.history.replaceState(null, "", url);

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ hours: state.hours, perSource: state.perSource }),
    );
  } catch {
    // localStorage kapalıysa sorun değil
  }
}

export function NewsExplorer({ items }: { items: DigestItem[] }) {
  // Sunucuyla aynı ilk boya: varsayılan pencere + kaynak başına varsayılan.
  const [state, setState] = useState<ExplorerState>(DEFAULTS);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // URL/localStorage ile bir kerelik senkron (paylaşılan bağlantı + kalıcı tercih).
    const sync = () => setState(readInitialState());
    sync();
  }, []);

  const update = (patch: Partial<ExplorerState>) => {
    const next = { ...state, ...patch };
    setState(next);
    persist(next);
  };

  const sourceOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) seen.add(item.source);
    return [...seen].sort((a, b) => a.localeCompare(b, "tr"));
  }, [items]);

  const filtered = useMemo(
    () =>
      viewItems(items, {
        q: state.q,
        source: state.sources,
        sinceHours: state.hours,
        perSource: state.perSource,
      }),
    [items, state.q, state.sources, state.hours, state.perSource],
  );

  const { lead, rail, rest } = useMemo(() => splitHome(filtered), [filtered]);

  const filterCount =
    state.sources.length +
    (state.hours !== DEFAULTS.hours ? 1 : 0) +
    (state.perSource !== DEFAULTS.perSource ? 1 : 0);
  const hasAny = state.q.trim().length > 0 || filterCount > 0;

  const toggleSource = (name: string) => {
    const sources = state.sources.includes(name)
      ? state.sources.filter((value) => value !== name)
      : [...state.sources, name];
    update({ sources });
  };

  const clearAll = () =>
    update({ q: "", sources: [], hours: DEFAULTS.hours, perSource: DEFAULTS.perSource });

  return (
    <div className="explorer">
      <div className="explorer-bar">
        <label className="explorer-search">
          <span className="sr-only">Haber ara</span>
          <input
            type="search"
            value={state.q}
            onChange={(event) => update({ q: event.target.value })}
            placeholder="Haber ara…"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button
          type="button"
          className="explorer-toggle"
          aria-expanded={open}
          aria-controls="explorer-panel"
          onClick={() => setOpen((value) => !value)}
        >
          Filtreler
          {filterCount > 0 ? <span className="explorer-badge">{filterCount}</span> : null}
        </button>
      </div>

      {open ? (
        <div className="explorer-panel" id="explorer-panel">
          <fieldset className="explorer-group">
            <legend>Kaynak</legend>
            {sourceOptions.map((name) => (
              <label key={name} className="explorer-option">
                <input
                  type="checkbox"
                  checked={state.sources.includes(name)}
                  onChange={() => toggleSource(name)}
                />
                <span>{name}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="explorer-group">
            <legend>Pencere</legend>
            {WINDOW_OPTIONS.map((hours) => (
              <label key={hours} className="explorer-option">
                <input
                  type="radio"
                  name="explorer-hours"
                  checked={state.hours === hours}
                  onChange={() => update({ hours })}
                />
                <span>Son {hours} saat</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="explorer-group">
            <legend>Kaynak başına</legend>
            {PER_SOURCE_OPTIONS.map((perSource) => (
              <label key={perSource} className="explorer-option">
                <input
                  type="radio"
                  name="explorer-persource"
                  checked={state.perSource === perSource}
                  onChange={() => update({ perSource })}
                />
                <span>{perSource} haber</span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : null}

      <div className="explorer-active">
        <span className="explorer-count">{filtered.length} haber</span>
        {state.sources.map((name) => (
          <button
            key={name}
            type="button"
            className="explorer-chip"
            onClick={() => toggleSource(name)}
          >
            {name} <span aria-hidden="true">×</span>
          </button>
        ))}
        {state.hours !== DEFAULTS.hours ? (
          <button
            type="button"
            className="explorer-chip"
            onClick={() => update({ hours: DEFAULTS.hours })}
          >
            Son {state.hours} saat <span aria-hidden="true">×</span>
          </button>
        ) : null}
        {state.perSource !== DEFAULTS.perSource ? (
          <button
            type="button"
            className="explorer-chip"
            onClick={() => update({ perSource: DEFAULTS.perSource })}
          >
            {state.perSource}/kaynak <span aria-hidden="true">×</span>
          </button>
        ) : null}
        {hasAny ? (
          <button type="button" className="explorer-clear" onClick={clearAll}>
            Temizle
          </button>
        ) : null}
      </div>

      {lead ? (
        <section className="tel-lead">
          <LeadStory item={lead} />
          <StoryRail items={rail} />
        </section>
      ) : (
        <p className="note">Bu aramada haber yok. Filtreleri temizleyip yeniden dene.</p>
      )}

      {rest.length > 0 ? (
        <section className="block">
          <h2>Son haberler</h2>
          <StoryList items={rest} />
        </section>
      ) : null}
    </div>
  );
}
