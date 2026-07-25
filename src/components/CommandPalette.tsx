import { useEffect, useMemo, useRef, useState } from "react";
import { actions, useStore } from "../store/store";
import { DECISIONS } from "../sim/data";
import { MAP_METRIC_LABEL } from "../lib/colors";
import { sfx } from "../lib/audio";

interface Command {
  id: string;
  label: string;
  hint: string;
  group: string;
  run: () => void;
}

interface Props {
  onClose: () => void;
  openDecisions: () => void;
  openHelp: () => void;
}

export function CommandPalette({ onClose, openDecisions, openHelp }: Props) {
  const state = useStore();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const commands = useMemo<Command[]>(() => {
    const c: Command[] = [
      {
        id: "play",
        label: state.playing ? "Mettre en pause" : "Lancer la simulation",
        hint: "Espace",
        group: "Temps",
        run: () => actions.togglePlay(),
      },
      { id: "speed", label: `Vitesse ×${state.speed} → cycler`, hint: "S", group: "Temps", run: () => actions.cycleSpeed() },
      { id: "y-start", label: "Aller a 2049", hint: "Home", group: "Temps", run: () => actions.setYear(2049) },
      { id: "y-end", label: "Aller a 2069", hint: "End", group: "Temps", run: () => actions.setYear(2069) },
      { id: "undo", label: "Annuler la derniere decision", hint: "Ctrl+Z", group: "Edition", run: () => actions.undo() },
      { id: "redo", label: "Retablir", hint: "Ctrl+Y", group: "Edition", run: () => actions.redo() },
      { id: "reset", label: "Reinitialiser la trajectoire", hint: "", group: "Edition", run: () => actions.reset() },
      { id: "decisions", label: "Ouvrir le centre de decision", hint: "D", group: "Navigation", run: openDecisions },
      { id: "mode", label: state.mode === "ops" ? "Basculer en mode Archives" : "Basculer en mode Operationnel", hint: "V", group: "Navigation", run: () => actions.toggleMode() },
      { id: "sound", label: state.soundOn ? "Couper le son" : "Activer l'ambiance sonore", hint: "M", group: "Navigation", run: () => actions.toggleSound() },
      { id: "help", label: "Afficher les raccourcis clavier", hint: "?", group: "Navigation", run: openHelp },
    ];
    (["pollution", "greenery", "density", "energyUse", "satisfaction"] as const).forEach((mk) =>
      c.push({
        id: `map-${mk}`,
        label: `Carte : ${MAP_METRIC_LABEL[mk]}`,
        hint: "",
        group: "Cartographie",
        run: () => actions.setMapMetric(mk),
      }),
    );
    // seuls les dossiers soumis cette annee sont arbitrables
    actions.currentOffers().forEach((d) =>
      c.push({
        id: `enact-${d.id}`,
        label: `Arbitrer ${d.ref} — ${d.title}`,
        hint: `${d.upfront} M`,
        group: `Dossiers ${state.currentYear}`,
        run: () => actions.enactDecision(d.id),
      }),
    );
    return c;
  }, [
    state.playing,
    state.speed,
    state.mode,
    state.soundOn,
    state.currentYear,
    state.enacted,
    openDecisions,
    openHelp,
  ]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((c) =>
      (c.label + " " + c.group).toLowerCase().includes(needle),
    );
  }, [q, commands]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    setActive(0);
  }, [q]);

  const runAt = (i: number) => {
    const cmd = filtered[i];
    if (!cmd) return;
    cmd.run();
    sfx.ui();
    onClose();
  };

  return (
    <div className="drawer-scrim palette-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Palette de commandes">
        <div className="palette-input">
          <span className="palette-caret label">⌘K</span>
          <input
            ref={inputRef}
            className="palette-field"
            placeholder="Rechercher une commande, une deliberation, une couche…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(filtered.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runAt(active);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
          />
        </div>
        <ul className="palette-list" id="palette-list" role="listbox" ref={listRef}>
          {filtered.length === 0 && <li className="palette-empty label">Aucune commande</li>}
          {filtered.map((c, i) => (
            <li
              key={c.id}
              id={`cmd-${c.id}`}
              role="option"
              aria-selected={i === active}
              className={`palette-item ${i === active ? "active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => runAt(i)}
            >
              <span className="palette-group label">{c.group}</span>
              <span className="palette-label">{c.label}</span>
              {c.hint && <kbd>{c.hint}</kbd>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
