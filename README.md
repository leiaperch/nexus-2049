# NEXUS 2049 — Le système d'exploitation d'une ville future

Expérience web interactive : pilotez la métropole fictive de **Méridienne** et
projetez vingt ans de conséquences (2049 → 2069) sur sept indicateurs, six
quartiers et une trame narrative générée par la simulation. La ville est rendue
en **3D temps réel** (three.js).

**En ligne : https://leiaperch.github.io/nexus-2049/**

---

## 1. Concept (10 lignes)

Après le Grand Décrochage climatique de 2041, Méridienne confie sa conduite à
NEXUS, un système d'exploitation urbain. L'utilisateur n'observe pas un tableau
de bord : il **arbitre**. Chaque année, une modale présente trois dossiers tirés
d'un catalogue de 48 politiques ; **trancher relance le temps**, qui avance
alors d'une année et soumet les dossiers suivants — on ne peut pas dérouler la
projection sans gouverner. Chaque décision
applique un effet immédiat annoncé, puis révèle des conséquences différées,
souvent indésirables, jamais annoncées à l'avance. En 2069, la chambre
régionale des comptes rend son **bilan de mandat**. Trois couches synchronisées composent
l'interface : la **ville vivante** (carte cartographique en canvas qui réagit
aux politiques), la **ligne temporelle** manipulable (glisser, jouer, comparer),
et le **centre de décision** (trois axes stratégiques, choix à coût, bénéfice et
risque). La trajectoire complète est une fonction **déterministe** des décisions
promulguées : `timeline = f(décisions)`. Le passé est figé, le futur se
recalcule. L'expérience se situe entre le simulateur stratégique, l'installation
institutionnelle et le design spéculatif.

## 2. Design tokens principaux

Définis dans [`src/styles/tokens.css`](src/styles/tokens.css).

| Rôle | Valeur |
| --- | --- |
| Encre (surfaces) | `#06080a` → `#242e33` (7 niveaux) |
| Os / texte | `#e9e5d9` (`--paper`), dim `#a7ada9` |
| Signal / alerte | `#dd4b2a` (vermillon) |
| Attention / énergie | `#d6a13a` (ambre) |
| Donnée | `#66b1a6` (teal) · flux `#8993cf` (indigo) |
| Vivant / biodiversité | `#83a86a` (vert) |
| Confiance | `#b07fb8` (violet) · mobilité `#7fb0c9` |
| Focus | `#f2c14e` |
| Typo données | `ui-monospace` (tabular-nums) |
| Typo texte | `Inter`, system-ui |
| Trame de fond | grille cartographique 32 px + vignettage |

Aucune image externe, aucun dégradé néon, aucun glassmorphism décoratif.
Toute la ville, les jauges et les courbes sont **construites en code** (Canvas + SVG).

## 3. Arborescence des composants

```
App                          # layout, clavier global, horloge, easter egg
├─ Intro                     # séquence d'ouverture < 15 s, désactivable
├─ TopBar                    # wordmark, indice de santé urbaine, mode, undo/redo
├─ stage (mode = ops)
│  ├─ CityScene              # three.js : parcellaire BSP, 10 archétypes bâtis,
│  │  │                        panneaux solaires et toitures végétalisées selon
│  │  │                        les indicateurs, grues sur les quartiers qui se
│  │  │                        densifient, voile de pollution, lignes de
│  │  │                        transport votées, éoliennes, IBL + ombres.
│  │  │                        Quartiers = boutons focusables projetés en 2D.
│  │  └─ DistrictInspector   # panneau quartier (avant/après vs 2049)
│  └─ stage-rail
│     ├─ IndicatorPanel      # 7 indicateurs : jauge segmentée + Sparkline
│     └─ EventFeed           # dépêches narratives NEXUS (aria-live)
├─ stage (mode = archive)
│  └─ Archives
│     ├─ DecisionLog         # registre chronologique des délibérations
│     ├─ CausalGraph         # relations de cause à effet (survol interactif)
│     └─ CompareBlock        # comparaison temporelle A → B
├─ Timeline                  # scrubber 2049-2069, lecture, vitesse, marqueurs
├─ DecisionCenter            # drawer : 3 axes, cartes à découverte progressive
├─ YearDossiers              # modale des dossiers de l'année (auto, ⇥ différable)
├─ Epilogue                  # bilan de mandat en 2069 : verdict, 2049→2069,
│                             arbitrages par axe, faits marquants, rejouer
├─ CommandPalette            # ⌘/Ctrl+K
├─ HelpOverlay               # raccourcis clavier
└─ Toast                     # notifications

sim/   types · catalogue (48 politiques) · data (ville, indicateurs)
       engine (projection pure + tirage des dossiers annuels + verrou)
store/ store externe (useSyncExternalStore) + undo/redo
lib/   format · colors (rampes) · audio (WebAudio) · scene3d (géométrie procédurale three.js)
hooks/ useClock · useCurrentYear
```

## 4. Lancer le projet

```bash
cd nexus-2049
npm install
npm run dev
```

Puis ouvrir l'URL affichée (par défaut `http://localhost:5173`).
Build de production : `npm run build` puis `npm run preview`.

Prérequis : Node 18+ et un navigateur WebGL. Aucun backend, aucune API, aucune clé.

**Déploiement** : chaque push sur `main` déclenche le workflow
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) qui build et publie
sur GitHub Pages (`base: /nexus-2049/` en production). Site :
https://leiaperch.github.io/nexus-2049/

## 5. Raccourcis clavier

| Touche | Action |
| --- | --- |
| `Espace` | Lancer / mettre en pause |
| `←` `→` | Reculer / avancer d'un an (`⇧` = 5 ans) |
| `Home` / `End` | Aller à 2049 / 2069 |
| `S` | Changer la vitesse (×0.5 → ×4) |
| `D` | Ouvrir le centre de décision |
| `V` | Basculer Opérationnel / Archives |
| `M` | Activer / couper l'ambiance sonore |
| `1` … `5` | Changer la couche cartographiée |
| `Ctrl/⌘ + Z` | Annuler · `Ctrl/⌘ + Y` (ou `⇧Z`) rétablir |
| `⌘/Ctrl + K` | Palette de commandes |
| `?` | Aide |
| `Échap` | Fermer les panneaux |
| _(taper « oracle »)_ | Easter egg discret |

## 6. Checklist accessibilité & performance

**Accessibilité (WCAG 2.2 AA visé)**
- Navigation clavier complète ; slider temporel `role="slider"` avec `aria-valuetext`.
- Chaque quartier de la carte est un `<button>` focusable et étiqueté (la carte
  `<canvas>` est `aria-hidden`, l'information n'est jamais portée par la seule couleur).
- Focus visible (anneau `--focus` à fort contraste) partout.
- Structure sémantique (`header`, `main`, `section`, `dialog`, tables), `sr-only`, skip-link.
- Dépêches en `aria-live="polite"`, toasts en `aria-live="assertive"`.
- Cibles tactiles ≥ 44 px en pointeur grossier.
- `prefers-reduced-motion` : intro, flux animés, scanlines et reflets désactivés.
- Textes sur fond encre au-dessus de 4.5:1 ; deltas doublés d'un glyphe ▲/▼/■.

**Performance**
- Un seul `requestAnimationFrame` pour la carte (6 polygones, DPR plafonné à 2).
- Store externe : seuls les composants abonnés se re-rendent.
- Projection recalculée uniquement à la promulgation/abrogation, pas au scrub.
- Bundle ≈ 103 kB gzip (React + Framer Motion inclus), aucune ressource réseau.

## 7. Limites techniques (honnêtes)

- La ville est une **maquette 3D low-poly générée en code** (aucun asset), pas un
  rendu urbain photoréaliste — choix assumé de direction artistique. Elle exige
  WebGL ; sur GPU logiciel (rasterizer CPU) la première compilation des shaders
  peut prendre quelques secondes.
- Le modèle de simulation est **plausible mais non calibré** sur des données
  réelles : il vise la cohérence des arbitrages, pas la prévision.
- Pas de persistance : recharger la page réinitialise la trajectoire (état en mémoire).
- L'ambiance sonore est **procédurale et minimale** (bips WebAudio), pas une
  bande-son ; désactivée par défaut, elle nécessite une interaction pour démarrer.
- Le comparateur temporel compare deux instantanés d'indicateurs ; il ne rejoue
  pas deux branches de décisions divergentes (le modèle est mono-trajectoire).
- Testé sur navigateurs à moteur Chromium/Firefox récents ; `backdrop-filter`
  dégrade proprement là où il n'est pas supporté.
```
