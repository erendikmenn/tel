"use client";

import { useEffect, useMemo, useState } from "react";
import { LeadStory } from "@/components/LeadStory";
import { StoryList } from "@/components/StoryList";
import { StoryRail } from "@/components/StoryRail";
import type { DigestItem } from "@/lib/digest";
import { filterItems } from "@/lib/filter";
import { splitHome } from "@/lib/home";

const TIME_WINDOWS: { label: string; value: number | null }[] = [
  { label: "Tümü", value: null },
  { label: "Son 1 saat", value: 1 },
  { label: "Son 6 saat", value: 6 },
  { label: "Son 12 saat", value: 12 },
  { label: "Son 24 saat", value: 24 },
];

type ExplorerState = {
  q: string;
  sources: string[];
  hours: number | null;
};

const EMPTY: ExplorerState = { q: "", sources: [], hours: null };

function parseHours(raw: string | null) {
  const value = Number(raw);
  return TIME_WINDOWS.some((window) => window.value === value) ? value : null;
}

function readUrl(): ExplorerState {
  if (typeof window === "undefined") return EMPTY;
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get("q") ?? "",
    sources: (params.get("kaynak") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    hours: parseHours(params.get("zaman")),
  };
}

function writeUrl(state: ExplorerState) {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.sources.length > 0) params.set("kaynak", state.sources.join(","));
  if (state.hours != null) params.set("zaman", String(state.hours));
  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

export function NewsExplorer({ items }: { items: DigestItem[] }) {
  // Sunucu ile aynı ilk boya: filtre yok. URL'den okuma, hidrasyondan sonra.
  const [state, setState] = useState<ExplorerState>(EMPTY);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // URL'deki ?q/kaynak/zaman ile bir kerelik senkron (paylaşılan bağlantı).
    const syncFromUrl = () => setState(readUrl());
    syncFromUrl();
  }, []);

  const update = (patch: Partial<ExplorerState>) => {
    const next = { ...state, ...patch };
    setState(next);
    writeUrl(next);
  };

  const sourceOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) seen.add(item.source);
    return [...seen].sort((a, b) => a.localeCompare(b, "tr"));
  }, [items]);

  const filtered = useMemo(
    () =>
      filterItems(items, {
        q: state.q,
        source: state.sources,
        sinceHours: state.hours ?? undefined,
      }),
    [items, state.q, state.sources, state.hours],
  );

  const { lead, rail, rest } = useMemo(() => splitHome(filtered), [filtered]);

  const filterCount = state.sources.length + (state.hours != null ? 1 : 0);
  const hasSearch = state.q.trim().length > 0;
  const hasAny = hasSearch || filterCount > 0;

  const toggleSource = (name: string) => {
    const sources = state.sources.includes(name)
      ? state.sources.filter((value) => value !== name)
      : [...state.sources, name];
    update({ sources });
  };

  const clearAll = () => update({ q: "", sources: [], hours: null });

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
            <legend>Zaman</legend>
            {TIME_WINDOWS.map((window) => (
              <label key={window.label} className="explorer-option">
                <input
                  type="radio"
                  name="explorer-hours"
                  checked={state.hours === window.value}
                  onChange={() => update({ hours: window.value })}
                />
                <span>{window.label}</span>
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
        {state.hours != null ? (
          <button
            type="button"
            className="explorer-chip"
            onClick={() => update({ hours: null })}
          >
            Son {state.hours} saat <span aria-hidden="true">×</span>
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
