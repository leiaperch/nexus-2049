import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TopBar } from "./components/TopBar";
import { CityScene } from "./components/CityScene";
import { IndicatorPanel } from "./components/IndicatorPanel";
import { Timeline } from "./components/Timeline";
import { EventFeed } from "./components/EventFeed";
import { YearDossiers } from "./components/YearDossiers";
import { Epilogue } from "./components/Epilogue";
import { DecisionPrompt } from "./components/DecisionPrompt";
import { DistrictInspector } from "./components/DistrictInspector";
import { DecisionCenter } from "./components/DecisionCenter";
import { CommandPalette } from "./components/CommandPalette";
import { Archives } from "./components/Archives";
import { Intro } from "./components/Intro";
import { Toast } from "./components/Toast";
import { HelpOverlay } from "./components/HelpOverlay";
import { useClock } from "./hooks/useClock";
import { actions, useStore } from "./store/store";
import { setAudioEnabled, sfx } from "./lib/audio";
import { HERO } from "./lib/hero";

const MAP_KEYS = ["pollution", "greenery", "density", "energyUse", "satisfaction"] as const;

export default function App() {
  const state = useStore();
  const [intro, setIntro] = useState(true);
  const [decisionsOpen, setDecisionsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [egg, setEgg] = useState(false);
  const eggBuf = useRef("");

  useClock();

  // Son : synchronise l'etat audio
  useEffect(() => {
    setAudioEnabled(state.soundOn);
  }, [state.soundOn]);

  // Retour sonore sur les notifications
  const lastToast = useRef<number>(0);
  useEffect(() => {
    if (!state.toast || state.toast.id === lastToast.current) return;
    lastToast.current = state.toast.id;
    if (state.toast.tone === "ok") sfx.enact();
    else if (state.toast.tone === "warn") sfx.alert();
    else sfx.ui();
  }, [state.toast]);

  const openDecisions = useCallback(() => {
    setPaletteOpen(false);
    setDecisionsOpen(true);
  }, []);
  const openHelp = useCallback(() => {
    setPaletteOpen(false);
    setHelpOpen(true);
  }, []);

  // Systeme clavier global
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const onKey = (e: KeyboardEvent) => {
      // Palette : accessible meme en saisie
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? actions.redo() : actions.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        actions.redo();
        return;
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setDecisionsOpen(false);
        setHelpOpen(false);
        setEgg(false);
        return;
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      // easter egg : taper « oracle »
      eggBuf.current = (eggBuf.current + e.key.toLowerCase()).slice(-6);
      if (eggBuf.current === "oracle") {
        setEgg(true);
        actions.toast("PROTOCOLE ORACLE deverrouille", "info");
        eggBuf.current = "";
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          actions.togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          actions.stepYear(e.shiftKey ? -5 : -1);
          break;
        case "ArrowRight":
          e.preventDefault();
          actions.stepYear(e.shiftKey ? 5 : 1);
          break;
        case "Home":
          e.preventDefault();
          actions.setYear(2049);
          break;
        case "End":
          e.preventDefault();
          actions.setYear(2069);
          break;
        case "s":
        case "S":
          actions.cycleSpeed();
          break;
        case "d":
        case "D":
          setDecisionsOpen(true);
          break;
        case "v":
        case "V":
          actions.toggleMode();
          break;
        case "m":
        case "M":
          actions.toggleSound();
          break;
        case "?":
          setHelpOpen(true);
          break;
        default:
          if (/^[1-5]$/.test(e.key)) {
            actions.setMapMetric(MAP_KEYS[Number(e.key) - 1]);
          }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Vitrine embarquée : seulement la ville zoomée, manipulable, sans le
  // tableau de bord ni l'intro.
  if (HERO) {
    return (
      <div className="app hero">
        <main id="stage" className="stage" data-mode="ops">
          <div className="stage-map">
            <CityScene />
            <DistrictInspector />
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <a className="skip-link" href="#stage">
        Aller au contenu principal
      </a>

      <AnimatePresence>
        {intro && <Intro key="intro" onDone={() => setIntro(false)} />}
      </AnimatePresence>

      <div className={`app ${egg ? "egg-on" : ""}`} aria-hidden={intro ? true : undefined}>
        <TopBar
          onOpenDecisions={() => setDecisionsOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
        />

        <main id="stage" className="stage" data-mode={state.mode}>
          {state.mode === "ops" ? (
            <>
              <div className="stage-map">
                <CityScene />
                <DistrictInspector />
              </div>
              <div className="stage-rail">
                <IndicatorPanel />
                <EventFeed />
              </div>
            </>
          ) : (
            <Archives />
          )}
        </main>

        <Timeline />

        <AnimatePresence>
          {!intro &&
            !state.dossiersOpen &&
            !state.epilogueOpen &&
            actions.blocked() && <DecisionPrompt key="prompt" />}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {decisionsOpen && (
          <DecisionCenter key="dc" onClose={() => setDecisionsOpen(false)} />
        )}
      </AnimatePresence>

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          openDecisions={openDecisions}
          openHelp={openHelp}
        />
      )}

      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}

      <AnimatePresence>
        {state.dossiersOpen && !state.epilogueOpen && (
          <YearDossiers key="dossiers" />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.epilogueOpen && <Epilogue key="epilogue" />}
      </AnimatePresence>

      <AnimatePresence>
        {egg && (
          <motion.div
            className="egg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-label="Protocole Oracle"
            onClick={() => setEgg(false)}
          >
            <div className="egg-card">
              <span className="label">NEXUS · journal systeme scelle</span>
              <p className="egg-text">
                « La ville n'a pas d'avenir unique. Chaque projection que vous
                lisez est une hypothese que NEXUS tient pour vraie le temps d'une
                deliberation. Le futur affiche est deterministe ; votre role ne
                l'est pas. » — note de conception, 2049.
              </p>
              <span className="label egg-close">cliquer pour refermer</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast />
    </>
  );
}
