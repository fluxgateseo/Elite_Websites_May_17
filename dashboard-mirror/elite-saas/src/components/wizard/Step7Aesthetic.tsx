"use client";

import { WizardState, DesignStyle, PalettePreset, FontPairing, HeroVariant, SectionId, CategoryLayout } from "@/lib/wizard-types";
import { StepNav } from "./StepNav";

const HERO_VARIANTS: { id: HeroVariant; label: string; description: string }[] = [
  { id: "hero-fullbleed", label: "Full-bleed", description: "Foto a tutto schermo con overlay scuro e CTA centrali. Premium, cinematico." },
  { id: "hero-mosaic", label: "Mosaic", description: "Titolo + griglia di 4 foto verticali. Editorial, food, beauty." },
  { id: "hero-split", label: "Split", description: "Testo a sinistra + foto a destra. Pulito, professionale, conversion-friendly." },
  { id: "hero-carousel", label: "Carousel", description: "Slideshow background con 3-5 foto. (Coming soon — fallback su Fullbleed)" },
];

const SECTIONS: { id: SectionId; label: string; description: string; ready: boolean }[] = [
  { id: "section-featured-dishes", label: "Piatti / Servizi in evidenza", description: "Griglia 3-6 card con foto + descrizione + link", ready: true },
  { id: "section-photo-mosaic", label: "Photo mosaic", description: "Mosaico 6-9 foto stile Instagram", ready: true },
  { id: "section-story", label: "Storia / Chi siamo", description: "Foto grande + testo (chef, fondatore, storia)", ready: true },
  { id: "section-map-hours", label: "Mappa + indirizzo", description: "Google Maps embed + NAP + click-to-call", ready: true },
  { id: "section-blog-feed", label: "Articoli recenti dal blog", description: "3 articoli più recenti con hero image", ready: true },
  { id: "section-cta-banner", label: "Banner CTA finale", description: "Banda piena con CTA primaria (Prenota / Contatti)", ready: true },
  { id: "section-stats", label: "Statistiche / Numeri", description: "Banda scura con 4 numeri (anni, recensioni, premi)", ready: true },
  { id: "section-testimonials", label: "Testimonianze", description: "3 quote clienti in colonna con citazioni in evidenza", ready: true },
  { id: "section-press", label: "Stampa / Press strip", description: "Logo strip stampa + recensioni", ready: false },
  { id: "section-newsletter", label: "Newsletter signup", description: "Form iscrizione email", ready: false },
];

const CATEGORY_LAYOUTS: { id: CategoryLayout; label: string; description: string; ready: boolean }[] = [
  { id: "cat-grid-cards", label: "Grid Cards", description: "Griglia 2-3 colonne con hero image. Default.", ready: true },
  { id: "cat-magazine", label: "Magazine", description: "1 articolo grande + 4 piccoli + lista. Editorial.", ready: true },
  { id: "cat-list-thumb", label: "List + thumb", description: "Lista verticale densa con miniatura sx, ottima per blog editorial.", ready: true },
  { id: "cat-filtered", label: "Filtered grid", description: "Grid con filtri per tag/prezzo. (Coming soon)", ready: false },
];

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const DESIGN_STYLES: { id: DesignStyle; title: string; description: string; suitable: string }[] = [
  {
    id: "Elegant",
    title: "Elegant",
    description: "Fonts serif eleganti, colori sobri (palette neutra), tanto white space, layout editorial.",
    suitable: "Ristoranti raffinati, fine dining, beauty premium, studi legali",
  },
  {
    id: "Modern",
    title: "Modern",
    description: "Sans-serif geometrici, palette fredda con accenti vivi, layout asimmetrico, micro-animazioni.",
    suitable: "Tech, SaaS, startup",
  },
  {
    id: "Editorial",
    title: "Editorial",
    description: "Magazine-style, tipografia mista (serif + sans), grid magazine, immagini grandi.",
    suitable: "Blog, food magazines, lifestyle",
  },
  {
    id: "Bold",
    title: "Bold",
    description: "Colori contrasto saturi, font heavy display, hero che riempie schermo, testo grande.",
    suitable: "Agencies, brand giovani, e-commerce",
  },
];

const PALETTES: { id: PalettePreset; swatches: string[]; label: string }[] = [
  { id: "Neutri caldi", label: "Neutri caldi", swatches: ["#F5F0EB", "#E8DACA", "#C4A882", "#8B6B47", "#4A3728"] },
  { id: "Neutri freddi", label: "Neutri freddi", swatches: ["#F4F6F8", "#E1E8ED", "#B0BEC5", "#607D8B", "#263238"] },
  { id: "Pastello", label: "Pastello", swatches: ["#FFF0F5", "#FFD6E7", "#C9B6E4", "#89CFF0", "#B5EAD7"] },
  { id: "Saturo brillante", label: "Saturo brillante", swatches: ["#FF6B6B", "#FFE66D", "#4ECDC4", "#45B7D1", "#96CEB4"] },
  { id: "Mono dark", label: "Mono dark", swatches: ["#1A1A1A", "#2D2D2D", "#404040", "#737373", "#E5E5E5"] },
  { id: "Custom", label: "Custom", swatches: [] },
];

const FONTS: { id: FontPairing; preview: { heading: string; body: string }; label: string }[] = [
  { id: "Playfair + Inter", label: "Playfair + Inter", preview: { heading: "serif", body: "sans-serif" } },
  { id: "DM Serif + DM Sans", label: "DM Serif + DM Sans", preview: { heading: "Georgia, serif", body: "Arial, sans-serif" } },
  { id: "IBM Plex Serif + IBM Plex Sans", label: "IBM Plex Serif + IBM Plex Sans", preview: { heading: "Georgia, serif", body: "Courier New, monospace" } },
];

export function Step7Aesthetic({ state, onChange, onNext, onBack }: Props) {
  const s = state.step7;

  function patch(fields: Partial<typeof s>) {
    onChange({ step7: { ...s, ...fields } });
  }

  const canProceed = !!s.designStyle && !!s.palette && !!s.fontPairing;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Come deve apparire il sito?</h1>
      <p className="text-zinc-500 mt-1 mb-6 text-sm">
        Scegli lo stile, poi affineremo i dettagli.
      </p>

      {/* Design Style */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Stile di design</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          {DESIGN_STYLES.map((ds) => {
            const selected = s.designStyle === ds.id;
            return (
              <button
                key={ds.id}
                onClick={() => patch({ designStyle: ds.id })}
                className={`text-left rounded-xl border-2 p-4 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                <div className={`text-sm font-semibold mb-1 ${selected ? "text-blue-700 dark:text-blue-300" : ""}`}>
                  {ds.title}
                </div>
                <div className="text-xs text-zinc-500 mb-1">{ds.description}</div>
                <div className="text-xs text-zinc-400">Buono per: {ds.suitable}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Palette */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Palette colori</h2>
        <div className="flex flex-wrap gap-3">
          {PALETTES.map((p) => {
            const selected = s.palette === p.id;
            return (
              <button
                key={p.id}
                onClick={() => patch({ palette: p.id })}
                className={`rounded-xl border-2 p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px] ${
                  selected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex gap-1 mb-2">
                  {p.swatches.length > 0
                    ? p.swatches.map((c) => (
                        <div
                          key={c}
                          className="w-5 h-5 rounded-full border border-zinc-200 dark:border-zinc-700 flex-shrink-0"
                          style={{ backgroundColor: c }}
                        />
                      ))
                    : (
                        <div className="w-24 h-5 rounded-full bg-gradient-to-r from-red-400 via-blue-400 to-green-400 opacity-70" />
                      )}
                </div>
                <div className="text-xs font-medium">{p.label}</div>
              </button>
            );
          })}
        </div>

        {s.palette === "Custom" && (
          <div className="mt-4 flex flex-wrap gap-4 pl-2 border-l-2 border-blue-300 dark:border-blue-800">
            {(["primary", "accent", "background"] as const).map((key) => (
              <div key={key}>
                <label className="block text-xs text-zinc-500 mb-1 capitalize">{key}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={s.customColors[key]}
                    onChange={(e) =>
                      patch({ customColors: { ...s.customColors, [key]: e.target.value } })
                    }
                    className="w-8 h-8 rounded border border-zinc-300 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-zinc-500">{s.customColors[key]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Font Pairing */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Tipografia</h2>
        <div className="flex flex-wrap gap-3">
          {FONTS.map((f) => {
            const selected = s.fontPairing === f.id;
            return (
              <button
                key={f.id}
                onClick={() => patch({ fontPairing: f.id })}
                className={`rounded-xl border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px] ${
                  selected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                <div style={{ fontFamily: f.preview.heading }} className="text-lg font-bold mb-1">
                  Titolo
                </div>
                <div style={{ fontFamily: f.preview.body }} className="text-xs text-zinc-500 mb-2">
                  Testo del corpo
                </div>
                <div className="text-xs font-medium">{f.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* References */}
      <div className="mb-6 max-w-lg">
        <h2 className="text-sm font-semibold mb-1">Riferimenti (opzionale)</h2>
        <p className="text-xs text-zinc-400 mb-2">Hai siti che ti ispirano? Incolla URL (uno per riga).</p>
        <textarea
          className="w-full text-sm px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          value={s.references}
          onChange={(e) => patch({ references: e.target.value })}
          placeholder="https://esempio.com&#10;https://altroesempio.it"
        />
      </div>

      {/* Layout — Hero variant */}
      <div className="mb-8 border-t border-zinc-200 dark:border-zinc-800 pt-8">
        <h2 className="text-sm font-semibold mb-1">Layout homepage — Hero</h2>
        <p className="text-xs text-zinc-400 mb-3">Come si presenta la prima sezione del sito.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          {HERO_VARIANTS.map((h) => {
            const selected = s.layout.hero === h.id;
            return (
              <button
                key={h.id}
                onClick={() => patch({ layout: { ...s.layout, hero: h.id } })}
                className={`text-left rounded-xl border-2 p-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                <div className={`text-sm font-semibold mb-1 ${selected ? "text-blue-700 dark:text-blue-300" : ""}`}>
                  {h.label}
                </div>
                <div className="text-xs text-zinc-500">{h.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layout — Sections (multi-select) */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-1">Sezioni homepage</h2>
        <p className="text-xs text-zinc-400 mb-3">
          Le sezioni si renderizzano nell&apos;ordine indicato. Spunta quelle che vuoi includere ({s.layout.sections.length} selezionate).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
          {SECTIONS.map((sec) => {
            const selected = s.layout.sections.includes(sec.id);
            const disabled = !sec.ready;
            return (
              <button
                key={sec.id}
                disabled={disabled}
                onClick={() => {
                  const next = selected
                    ? s.layout.sections.filter((x) => x !== sec.id)
                    : [...s.layout.sections, sec.id];
                  patch({ layout: { ...s.layout, sections: next } });
                }}
                className={`text-left rounded-lg border-2 p-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  disabled
                    ? "opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800"
                    : selected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled}
                    readOnly
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${selected ? "text-blue-700 dark:text-blue-300" : ""}`}>
                      {sec.label}
                      {!sec.ready && <span className="ml-2 text-xs text-zinc-400">(soon)</span>}
                    </div>
                    <div className="text-xs text-zinc-500">{sec.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layout — Category page */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-1">Layout pagine categoria (es. /blog/)</h2>
        <p className="text-xs text-zinc-400 mb-3">Come si presentano gli archivi articoli.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          {CATEGORY_LAYOUTS.map((c) => {
            const selected = s.layout.categoryLayout === c.id;
            const disabled = !c.ready;
            return (
              <button
                key={c.id}
                disabled={disabled}
                onClick={() => patch({ layout: { ...s.layout, categoryLayout: c.id } })}
                className={`text-left rounded-xl border-2 p-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  disabled
                    ? "opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800"
                    : selected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                <div className={`text-sm font-semibold mb-1 ${selected ? "text-blue-700 dark:text-blue-300" : ""}`}>
                  {c.label}
                  {!c.ready && <span className="ml-2 text-xs text-zinc-400">(soon)</span>}
                </div>
                <div className="text-xs text-zinc-500">{c.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!canProceed} />
    </div>
  );
}
