// NEXUS 2049 — catalogue des decisions soumises a arbitrage.
// Chaque annee, trois dossiers sont tires de ce catalogue. Le joueur en promulgue
// au moins un pour avancer d'une annee. Les consequences differees se declenchent
// plus tard, parfois contre l'intention initiale.

import type { Decision } from "./types";

const ENERGIE: Decision[] = [
  {
    id: "nrg-reseau-chaleur",
    track: "energie",
    title: "Réseau de chaleur métropolitain",
    ref: "NRG-01",
    line: "Poser 42 km de réseau de chaleur alimenté par la chaufferie de Verrières.",
    upfront: 111,
    recurring: 6,
    immediate: { energy: 3, carbon: -0.2, trust: 1 },
    ongoing: { energy: 0.9, carbon: -0.15, qol: 0.2 },
    districtOngoing: { target: "residentiel", energyUse: -0.6, pollution: -0.3 },
    delayed: [
      {
        delay: 2,
        indicators: { trust: -2 },
        narrative:
          "Les tranchées de la rue des Halles immobilisent le commerce du centre pendant deux saisons.",
        tone: "negatif",
      },
      {
        delay: 3,
        indicators: { budget: 21, energy: 2 },
        narrative:
          "Les 42 km sont mis en service. Les abonnements industriels couvrent l'exploitation dès la troisième saison de chauffe.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { qol: 2, trust: 1 },
        narrative:
          "Le prix de la chaleur livrée reste stable pendant la flambée des cours du gaz.",
        tone: "positif",
      },
    ],
  },
  {
    id: "nrg-solaire-toitures",
    track: "energie",
    title: "Solarisation des toitures publiques",
    ref: "NRG-02",
    line: "Équiper 900 toitures publiques en photovoltaïque, exploitation en régie.",
    upfront: 47,
    recurring: 3,
    immediate: { energy: 3, trust: 2 },
    ongoing: { energy: 0.7, carbon: -0.08, budget: 0.6 },
    districtOngoing: { target: "affaires", energyUse: -0.4 },
    delayed: [
      {
        delay: 4,
        indicators: { budget: 18 },
        narrative:
          "La régie solaire dégage son premier excédent : douze millions de crédits sont reversés au budget général.",
        tone: "positif",
      },
      {
        delay: 7,
        indicators: { energy: -0.5 },
        narrative:
          "Les premiers onduleurs arrivent en fin de vie et le rendement du parc recule avant remplacement.",
        tone: "neutre",
      },
    ],
  },
  {
    id: "nrg-eolien-large",
    track: "energie",
    title: "Parc éolien au large de Méridienne",
    ref: "NRG-03",
    line: "Construire 34 éoliennes au large, raccordées au poste de Grand-Quai.",
    upfront: 204,
    recurring: 11,
    immediate: { energy: 6, trust: -2 },
    ongoing: { energy: 2.2, carbon: -0.5 },
    districtOngoing: { target: "portuaire", energyUse: -0.5, pollution: -0.2 },
    delayed: [
      {
        delay: 2,
        indicators: { trust: -3 },
        narrative:
          "Les comités de pêcheurs contestent le tracé du câble d'atterrage devant le tribunal administratif.",
        tone: "negatif",
      },
      {
        delay: 4,
        indicators: { budget: 38, energy: 3 },
        narrative:
          "Le parc atteint sa pleine puissance. Les ventes d'électricité couvrent désormais l'annuité d'emprunt.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { biodiversity: -3, trust: -2 },
        narrative:
          "Le suivi ornithologique relève une mortalité supérieure aux projections sur le couloir migratoire côtier.",
        tone: "alerte",
      },
    ],
    excludes: ["nrg-smr-nucleaire"],
  },
  {
    id: "nrg-renovation-logements",
    track: "energie",
    title: "Rénovation thermique du parc social",
    ref: "NRG-04",
    line: "Isoler 180 000 logements, priorité à Verrières.",
    upfront: 136,
    recurring: -1,
    immediate: { qol: 3, energy: 2, trust: 3 },
    ongoing: { energy: 1.1, carbon: -0.3, qol: 0.5 },
    districtOngoing: { target: "residentiel", energyUse: -0.9, satisfaction: 0.5 },
    delayed: [
      {
        delay: 2,
        indicators: { trust: -2, qol: -2 },
        narrative:
          "Les chantiers en site occupé font l'objet de 1 200 réclamations pour nuisances et retards de livraison.",
        tone: "negatif",
      },
      {
        delay: 5,
        indicators: { budget: 27, qol: 3 },
        narrative:
          "La facture énergétique des ménages rénovés baisse de 41 % et les impayés de loyer reculent.",
        tone: "positif",
      },
    ],
  },
  {
    id: "nrg-smr-nucleaire",
    track: "energie",
    title: "Réacteurs modulaires de Grand-Quai",
    ref: "NRG-05",
    line: "Implanter deux réacteurs modulaires de 170 MW sur l'ancien site thermique.",
    upfront: 221,
    recurring: 12,
    immediate: { energy: 7, trust: -5, carbon: -0.3 },
    ongoing: { energy: 2.6, carbon: -0.6, budget: -0.5 },
    districtOngoing: { target: "portuaire", energyUse: -0.8 },
    delayed: [
      {
        delay: 3,
        indicators: { trust: -4 },
        narrative:
          "Le référendum d'initiative locale sur l'implantation recueille 58 % d'avis défavorables.",
        tone: "negatif",
      },
      {
        delay: 5,
        indicators: { budget: 45, energy: 3 },
        narrative:
          "Le couplage à la boucle de chaleur portuaire génère trente millions de crédits de recettes annexes.",
        tone: "positif",
      },
      {
        delay: 7,
        indicators: { carbon: -0.4, qol: 2 },
        narrative:
          "La centrale au gaz de Grand-Quai est arrêtée définitivement et les relevés d'oxydes d'azote du port chutent.",
        tone: "positif",
      },
    ],
    excludes: ["nrg-eolien-large"],
    minYear: 2058,
  },
  {
    id: "nrg-hydrogene-portuaire",
    track: "energie",
    title: "Électrolyseur du bassin nord",
    ref: "NRG-06",
    line: "Produire de l'hydrogène pour les navires et le fret lourd du bassin nord.",
    upfront: 123,
    recurring: 7,
    immediate: { energy: 3, carbon: -0.2 },
    ongoing: { energy: 0.8, carbon: -0.25, budget: 0.4 },
    districtOngoing: { target: "portuaire", pollution: -0.6 },
    delayed: [
      {
        delay: 4,
        indicators: { budget: 22, mobility: 2 },
        narrative:
          "Douze armateurs signent des contrats d'avitaillement pluriannuels au bassin nord.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { budget: -10 },
        narrative:
          "Le rendement réel de la chaîne hydrogène reste sous les hypothèses de dimensionnement. L'écart est comblé sur fonds propres.",
        tone: "alerte",
      },
    ],
    requires: "nrg-eolien-large",
    minYear: 2055,
  },
  {
    id: "nrg-stockage-batteries",
    track: "energie",
    title: "Stockage stationnaire de Prairie-Basse",
    ref: "NRG-07",
    line: "Installer 400 MWh de batteries pour lisser les pointes du réseau.",
    upfront: 77,
    recurring: 4,
    immediate: { energy: 3 },
    ongoing: { energy: 0.9, budget: 0.8 },
    delayed: [
      {
        delay: 3,
        indicators: { budget: 24, energy: 1 },
        narrative:
          "L'arbitrage sur le marché infrajournalier rapporte plus que prévu au gestionnaire du site.",
        tone: "positif",
      },
      {
        delay: 8,
        indicators: { budget: -12, energy: -1 },
        narrative:
          "Le premier renouvellement des modules intervient trois ans plus tôt que la garantie constructeur ne le laissait attendre.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "nrg-reseau-intelligent",
    track: "energie",
    title: "Modernisation du réseau de distribution",
    ref: "NRG-08",
    line: "Reprendre les postes de distribution et piloter la charge en temps réel.",
    upfront: 64,
    recurring: 4,
    immediate: { energy: 2, qol: 1 },
    ongoing: { energy: 0.7, budget: 0.5 },
    districtOngoing: { target: "all", energyUse: -0.2 },
    delayed: [
      {
        delay: 3,
        indicators: { budget: 16, trust: 2 },
        narrative:
          "Les coupures non programmées diminuent de moitié sur l'ensemble du territoire desservi.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { trust: -2 },
        narrative:
          "Une panne du superviseur prive quarante mille foyers de pilotage pendant onze heures.",
        tone: "alerte",
      },
    ],
  },
  {
    id: "nrg-biogaz-boues",
    track: "energie",
    title: "Méthanisation des boues et biodéchets",
    ref: "NRG-09",
    line: "Valoriser les boues de la station d'épuration et les biodéchets collectés.",
    upfront: 51,
    recurring: 3,
    immediate: { energy: 2, carbon: -0.15 },
    ongoing: { energy: 0.5, carbon: -0.12, budget: 0.7 },
    districtOngoing: { target: "portuaire", pollution: 0.2 },
    delayed: [
      {
        delay: 3,
        indicators: { budget: 19 },
        narrative:
          "L'injection de biométhane dans le réseau couvre l'exploitation et dégage un excédent.",
        tone: "positif",
      },
      {
        delay: 4,
        indicators: { qol: -2, trust: -2 },
        narrative:
          "Les riverains de la station signalent des nuisances olfactives récurrentes en période estivale.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "nrg-sobriete-eclairage",
    track: "energie",
    title: "Sobriété de l'éclairage public",
    ref: "NRG-10",
    line: "Convertir 46 000 points lumineux en LED et éteindre entre 1 h et 5 h.",
    upfront: 21,
    recurring: 3,
    immediate: { energy: 2, carbon: -0.1, trust: -1 },
    ongoing: { energy: 0.4, budget: 1.2, biodiversity: 0.3 },
    districtOngoing: { target: "all", energyUse: -0.3 },
    delayed: [
      {
        delay: 2,
        indicators: { budget: 14, biodiversity: 2 },
        narrative:
          "La facture d'éclairage baisse de 38 % et les comptages de chiroptères remontent sur les axes éteints.",
        tone: "positif",
      },
      {
        delay: 3,
        indicators: { qol: -2, trust: -2 },
        narrative:
          "Le sentiment d'insécurité nocturne progresse en périphérie, sans hausse mesurée des faits constatés.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "nrg-geothermie-profonde",
    track: "energie",
    title: "Doublet géothermique de Verrières",
    ref: "NRG-11",
    line: "Forer un doublet géothermique pour chauffer le nord résidentiel.",
    upfront: 94,
    recurring: 5,
    immediate: { energy: 3, carbon: -0.2 },
    ongoing: { energy: 0.9, carbon: -0.2, qol: 0.3 },
    districtOngoing: { target: "residentiel", energyUse: -0.7 },
    delayed: [
      {
        delay: 4,
        indicators: { budget: 21, energy: 2 },
        narrative:
          "Le doublet atteint le débit nominal et remplace la moitié des chaudières collectives du secteur.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { trust: -2, budget: -8 },
        narrative:
          "Une micro-sismicité induite, sans dommage relevé, impose l'arrêt du puits injecteur pendant six mois.",
        tone: "alerte",
      },
    ],
    minYear: 2053,
  },
  {
    id: "nrg-autoconsommation",
    track: "energie",
    title: "Communautés énergétiques de quartier",
    ref: "NRG-12",
    line: "Autoriser le partage local d'électricité entre producteurs et voisins raccordés.",
    upfront: 17,
    recurring: 3,
    immediate: { energy: 2, trust: 3 },
    ongoing: { energy: 0.4, trust: 0.5 },
    districtOngoing: { target: "residentiel", satisfaction: 0.3, energyUse: -0.2 },
    delayed: [
      {
        delay: 3,
        indicators: { trust: 3, energy: 1 },
        narrative:
          "Quarante-sept communautés sont constituées, dont trente dans le parc social de Verrières.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { trust: -2 },
        narrative:
          "L'écart de bénéfice entre propriétaires équipés et locataires alimente une contestation sur l'équité du dispositif.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "nrg-tarif-social",
    track: "energie",
    title: "Tarification sociale de l'énergie",
    ref: "NRG-13",
    line: "Plafonner la facture de chauffage des ménages sous le seuil de précarité.",
    upfront: 13,
    recurring: -3,
    immediate: { qol: 4, trust: 5 },
    ongoing: { qol: 0.6, trust: 0.5, budget: -0.4 },
    districtOngoing: { target: "residentiel", satisfaction: 0.6 },
    delayed: [
      {
        delay: 3,
        indicators: { trust: 3, qol: 2 },
        narrative:
          "Les coupures pour impayés reculent de 71 % sur le territoire métropolitain.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { budget: -14 },
        narrative:
          "L'élargissement du seuil d'éligibilité porte le coût du dispositif au-delà de l'enveloppe votée.",
        tone: "alerte",
      },
    ],
  },
  {
    id: "nrg-datacenter-chaleur",
    track: "energie",
    title: "Récupération de la chaleur des centres de données",
    ref: "NRG-14",
    line: "Raccorder les centres de données de la Presqu'île au réseau de chaleur.",
    upfront: 38,
    recurring: 3,
    immediate: { energy: 2, carbon: -0.1 },
    ongoing: { energy: 0.6, carbon: -0.1, budget: 1 },
    districtOngoing: { target: "affaires", energyUse: -0.4 },
    delayed: [
      {
        delay: 3,
        indicators: { budget: 25, energy: 1 },
        narrative:
          "La chaleur fatale récupérée couvre neuf mille équivalents-logements et se vend au tarif du réseau.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { energy: -1, trust: -1 },
        narrative:
          "Deux opérateurs délocalisent leurs baies et laissent une part du raccordement sans charge.",
        tone: "negatif",
      },
    ],
    requires: "nrg-reseau-chaleur",
    minYear: 2054,
  },
  {
    id: "nrg-solaire-friches",
    track: "energie",
    title: "Centrale solaire des friches de Grand-Quai",
    ref: "NRG-15",
    line: "Couvrir 180 hectares de friches industrielles en photovoltaïque au sol.",
    upfront: 81,
    recurring: 4,
    immediate: { energy: 4, biodiversity: -1 },
    ongoing: { energy: 1.2, carbon: -0.2, budget: 0.9 },
    districtOngoing: { target: "portuaire", greenery: 0.2, energyUse: -0.4 },
    delayed: [
      {
        delay: 4,
        indicators: { budget: 29 },
        narrative:
          "La vente d'électricité couvre l'investissement plus vite que le plan de financement ne le prévoyait.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { biodiversity: 2 },
        narrative:
          "Le pâturage ovin sous panneaux restaure une prairie sèche sur l'ancienne plateforme de stockage.",
        tone: "positif",
      },
    ],
  },
  {
    id: "nrg-extension-chaleur",
    track: "energie",
    title: "Extension du réseau de chaleur vers la Presqu'île",
    ref: "NRG-16",
    line: "Prolonger la boucle de chaleur de 18 km vers la Presqu'île et les hôpitaux.",
    upfront: 72,
    recurring: 4,
    immediate: { energy: 3, qol: 1 },
    ongoing: { energy: 0.8, carbon: -0.15, budget: 0.8 },
    districtOngoing: { target: "affaires", energyUse: -0.5 },
    delayed: [
      {
        delay: 3,
        indicators: { budget: 22, energy: 2 },
        narrative:
          "Hôpitaux et universités basculent sur le réseau, portant le taux de raccordement à 61 %.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { budget: -9, trust: -1 },
        narrative:
          "Le franchissement du bras nord révèle des sols pollués. Le surcoût de dépollution est imputé au budget d'investissement.",
        tone: "negatif",
      },
    ],
    requires: "nrg-reseau-chaleur",
    minYear: 2055,
  },
];

const MOBILITE: Decision[] = [
  {
    id: "mob-tram-ligne-a",
    track: "mobilite",
    title: "Ligne A du tramway",
    ref: "MOB-01",
    line: "Créer 19 km de tramway entre Grand-Quai et Verrières.",
    upfront: 179,
    recurring: -7,
    immediate: { mobility: 6, trust: 2, carbon: -0.1 },
    ongoing: { mobility: 1.8, carbon: -0.25, qol: 0.4 },
    districtOngoing: { target: "residentiel", pollution: -0.4, satisfaction: 0.4 },
    delayed: [
      {
        delay: 2,
        indicators: { trust: -3, mobility: -2 },
        narrative:
          "Les déviations de chantier allongent de onze minutes les temps de parcours automobile en heure de pointe.",
        tone: "negatif",
      },
      {
        delay: 4,
        indicators: { mobility: 4, budget: 18 },
        narrative:
          "La ligne transporte 118 000 voyageurs par jour, au-dessus des prévisions de trafic.",
        tone: "positif",
      },
      {
        delay: 7,
        indicators: { qol: 2, budget: 14 },
        narrative:
          "Les valeurs foncières le long du tracé progressent et augmentent les recettes de taxe d'aménagement.",
        tone: "positif",
      },
    ],
  },
  {
    id: "mob-tram-tangentielle",
    track: "mobilite",
    title: "Tangentielle du tramway",
    ref: "MOB-02",
    line: "Relier les faubourgs entre eux sans passer par le centre, sur 14 km.",
    upfront: 128,
    recurring: -5,
    immediate: { mobility: 5, qol: 2 },
    ongoing: { mobility: 1.6, carbon: -0.2 },
    districtOngoing: { target: "residentiel", satisfaction: 0.5, density: 0.2 },
    delayed: [
      {
        delay: 4,
        indicators: { mobility: 3, budget: 15 },
        narrative:
          "Les trajets de faubourg à faubourg gagnent vingt-deux minutes en moyenne.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { trust: -2 },
        narrative:
          "La fréquentation reste inférieure d'un tiers aux prévisions sur la section ouest.",
        tone: "negatif",
      },
    ],
    requires: "mob-tram-ligne-a",
    minYear: 2056,
  },
  {
    id: "mob-metro-automatique",
    track: "mobilite",
    title: "Métro automatique ligne 1",
    ref: "MOB-03",
    line: "Percer 11 km de métro automatique sous l'axe historique nord-sud.",
    upfront: 221,
    recurring: -8,
    immediate: { mobility: 7, trust: 1 },
    ongoing: { mobility: 2.4, carbon: -0.3, qol: 0.4 },
    districtOngoing: { target: "affaires", density: 0.4, satisfaction: 0.4 },
    delayed: [
      {
        delay: 3,
        indicators: { budget: -20, trust: -3 },
        narrative:
          "Le tunnelier rencontre des remblais instables sous la vieille ville. Le chantier prend dix-neuf mois de retard.",
        tone: "alerte",
      },
      {
        delay: 6,
        indicators: { mobility: 5, budget: 33 },
        narrative:
          "L'exploitation sans conducteur ramène le coût au voyageur sous celui du réseau de surface.",
        tone: "positif",
      },
    ],
    minYear: 2057,
  },
  {
    id: "mob-bus-electrique",
    track: "mobilite",
    title: "Conversion électrique du parc de bus",
    ref: "MOB-04",
    line: "Remplacer 420 autobus diesel et équiper trois dépôts en recharge.",
    upfront: 102,
    recurring: -4,
    immediate: { mobility: 2, carbon: -0.2, qol: 2 },
    ongoing: { carbon: -0.2, qol: 0.3, mobility: 0.4 },
    districtOngoing: { target: "all", pollution: -0.4 },
    delayed: [
      {
        delay: 4,
        indicators: { budget: 18, qol: 2 },
        narrative:
          "Le coût d'exploitation au kilomètre passe sous celui du diesel et les plaintes pour bruit chutent sur les lignes converties.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { budget: -8 },
        narrative:
          "L'autonomie hivernale impose l'achat de dix-huit véhicules supplémentaires pour tenir les graphiques.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "mob-reseau-cyclable",
    track: "mobilite",
    title: "Réseau cyclable structurant",
    ref: "MOB-05",
    line: "Aménager 240 km de pistes séparées et 12 000 places de stationnement vélo.",
    upfront: 55,
    recurring: -3,
    immediate: { mobility: 4, qol: 3, carbon: -0.1 },
    ongoing: { mobility: 1, carbon: -0.15, qol: 0.4 },
    districtOngoing: { target: "mixte", pollution: -0.3, satisfaction: 0.3 },
    delayed: [
      {
        delay: 3,
        indicators: { mobility: 3, qol: 2 },
        narrative:
          "La part modale du vélo passe de 4 % à 13 % en trois ans.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { qol: -1, trust: -1 },
        narrative:
          "Les conflits d'usage sur les axes partagés avec les bus donnent lieu à quatre cents signalements annuels.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "mob-pietonisation-centre",
    track: "mobilite",
    title: "Piétonisation du centre historique",
    ref: "MOB-06",
    line: "Fermer 60 hectares du centre à la circulation motorisée, hors livraisons.",
    upfront: 34,
    recurring: -3,
    immediate: { qol: 5, mobility: -3, trust: -3, carbon: -0.1 },
    ongoing: { qol: 0.8, biodiversity: 0.2, carbon: -0.1 },
    districtOngoing: { target: "historique", pollution: -0.8, satisfaction: 0.5 },
    delayed: [
      {
        delay: 1,
        indicators: { trust: -4 },
        narrative:
          "Les unions commerçantes déposent un recours et organisent trois journées de fermeture.",
        tone: "negatif",
      },
      {
        delay: 3,
        indicators: { qol: 3, budget: 16, trust: 3 },
        narrative:
          "Le chiffre d'affaires du commerce de détail du centre progresse de 9 % après deux saisons difficiles.",
        tone: "positif",
      },
      {
        delay: 5,
        districts: { greenery: 0.6, target: "historique" },
        narrative:
          "Les anciennes voies de desserte sont plantées et les places rendues aux terrasses et aux jeux.",
        tone: "positif",
      },
    ],
  },
  {
    id: "mob-peage-urbain",
    track: "mobilite",
    title: "Péage de congestion",
    ref: "MOB-07",
    line: "Tarifer l'entrée dans l'hypercentre aux heures de pointe.",
    upfront: 30,
    recurring: 3,
    immediate: { mobility: 2, trust: -6, carbon: -0.2 },
    ongoing: { mobility: 0.6, carbon: -0.15, budget: 1.4 },
    districtOngoing: { target: "historique", pollution: -0.6 },
    delayed: [
      {
        delay: 2,
        indicators: { budget: 33, mobility: 2 },
        narrative:
          "Le péage rapporte vingt-deux millions de crédits nets, affectés à l'exploitation du réseau de surface.",
        tone: "positif",
      },
      {
        delay: 4,
        indicators: { trust: -3, qol: -1 },
        narrative:
          "Le report de trafic sur la rocade sud dégrade la qualité de l'air de deux quartiers non couverts.",
        tone: "alerte",
      },
    ],
    excludes: ["mob-vignette-zfe"],
    minYear: 2053,
  },
  {
    id: "mob-vignette-zfe",
    track: "mobilite",
    title: "Zone à faibles émissions",
    ref: "MOB-08",
    line: "Interdire par étapes les véhicules les plus émetteurs dans l'anneau central.",
    upfront: 26,
    recurring: 3,
    immediate: { carbon: -0.25, qol: 3, trust: -5 },
    ongoing: { carbon: -0.2, qol: 0.5, budget: 0.4 },
    districtOngoing: { target: "mixte", pollution: -0.5 },
    delayed: [
      {
        delay: 3,
        indicators: { qol: 3, budget: 12 },
        narrative:
          "Les dépassements réglementaires de dioxyde d'azote disparaissent des stations de mesure du centre.",
        tone: "positif",
      },
      {
        delay: 4,
        indicators: { trust: -4 },
        narrative:
          "Les ménages qui ne peuvent remplacer leur véhicule saisissent le médiateur. Le dispositif d'aide est jugé insuffisant.",
        tone: "negatif",
      },
    ],
    excludes: ["mob-peage-urbain"],
  },
  {
    id: "mob-logistique-fluviale",
    track: "mobilite",
    title: "Logistique fluviale et hubs urbains",
    ref: "MOB-09",
    line: "Basculer la marchandise sur le fleuve et livrer le dernier kilomètre en vélo-cargo.",
    upfront: 89,
    recurring: 5,
    immediate: { mobility: 3, carbon: -0.3 },
    ongoing: { carbon: -0.25, mobility: 0.6, budget: 0.8 },
    districtOngoing: { target: "portuaire", pollution: -0.4 },
    delayed: [
      {
        delay: 3,
        indicators: { budget: 21, mobility: 2 },
        narrative:
          "Les redevances des quatre hubs couvrent l'exploitation. Deux mille trois cents poids lourds quotidiens quittent le centre.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { trust: -2 },
        narrative:
          "Deux transporteurs contestent l'obligation de rupture de charge devant l'autorité de la concurrence.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "mob-fret-fluvial-extension",
    track: "mobilite",
    title: "Extension des quais de fret",
    ref: "MOB-10",
    line: "Allonger les quais du bassin sud et doubler la capacité de transbordement.",
    upfront: 111,
    recurring: 6,
    immediate: { mobility: 3, carbon: -0.2, biodiversity: -1 },
    ongoing: { carbon: -0.2, budget: 1.2, mobility: 0.5 },
    districtOngoing: { target: "portuaire", density: 0.3, pollution: -0.2 },
    delayed: [
      {
        delay: 4,
        indicators: { budget: 36 },
        narrative:
          "Le trafic fluvial dépasse le seuil de rentabilité du terminal et les redevances doublent.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { biodiversity: -2, qol: -1 },
        narrative:
          "Le dragage répété du chenal appauvrit les frayères de l'estuaire selon le suivi halieutique.",
        tone: "alerte",
      },
    ],
    requires: "mob-logistique-fluviale",
    minYear: 2055,
  },
  {
    id: "mob-rer-metropolitain",
    track: "mobilite",
    title: "RER métropolitain",
    ref: "MOB-11",
    line: "Cadencer au quart d'heure les trois lignes ferroviaires du bassin de vie.",
    upfront: 157,
    recurring: -6,
    immediate: { mobility: 6, carbon: -0.2, trust: 2 },
    ongoing: { mobility: 2, carbon: -0.25 },
    districtOngoing: { target: "residentiel", satisfaction: 0.4, density: 0.2 },
    delayed: [
      {
        delay: 3,
        indicators: { trust: -3, mobility: -2 },
        narrative:
          "Les travaux de signalisation imposent seize week-ends d'interruption totale sur la ligne ouest.",
        tone: "negatif",
      },
      {
        delay: 5,
        indicators: { mobility: 4, budget: 24 },
        narrative:
          "Le cadencement capte 61 000 déplacements quotidiens auparavant assurés en voiture.",
        tone: "positif",
      },
    ],
    minYear: 2054,
  },
  {
    id: "mob-teletravail-tiers-lieux",
    track: "mobilite",
    title: "Tiers-lieux et télétravail encadré",
    ref: "MOB-12",
    line: "Ouvrir 40 tiers-lieux de proximité et conventionner les employeurs publics.",
    upfront: 26,
    recurring: -3,
    immediate: { mobility: 3, qol: 3, carbon: -0.1 },
    ongoing: { mobility: 0.5, carbon: -0.1, qol: 0.3 },
    districtOngoing: { target: "residentiel", satisfaction: 0.3 },
    delayed: [
      {
        delay: 3,
        indicators: { budget: 11, carbon: -0.1 },
        narrative:
          "Les déplacements domicile-travail reculent de 12 % et deux immeubles de bureaux de la Presqu'île sont reconvertis.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { qol: -2, trust: -1 },
        narrative:
          "La restauration et le commerce du quartier d'affaires enregistrent une baisse durable de fréquentation.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "mob-autopartage",
    track: "mobilite",
    title: "Autopartage électrique en boucle ouverte",
    ref: "MOB-13",
    line: "Déployer 1 400 véhicules partagés et supprimer autant de places résidentielles.",
    upfront: 38,
    recurring: 3,
    immediate: { mobility: 3, qol: 1, trust: -1 },
    ongoing: { mobility: 0.7, carbon: -0.1, budget: 0.3 },
    districtOngoing: { target: "mixte", satisfaction: 0.2, pollution: -0.2 },
    delayed: [
      {
        delay: 3,
        indicators: { mobility: 2, budget: 9 },
        narrative:
          "Le taux de motorisation des ménages du centre passe sous 0,6 véhicule par foyer.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { budget: -7 },
        narrative:
          "La rotation des véhicules reste faible en périphérie et l'équilibre d'exploitation n'est pas atteint.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "mob-gratuite-transports",
    track: "mobilite",
    title: "Gratuité totale des transports",
    ref: "MOB-14",
    line: "Supprimer la billettique sur l'ensemble du réseau urbain.",
    upfront: 17,
    recurring: -3,
    immediate: { mobility: 5, trust: 7, qol: 3 },
    ongoing: { mobility: 1.2, trust: 0.6, budget: -1.5 },
    districtOngoing: { target: "all", satisfaction: 0.4 },
    delayed: [
      {
        delay: 2,
        indicators: { mobility: 3, carbon: -0.15 },
        narrative:
          "La fréquentation progresse de 34 %. La charge des lignes de rocade atteint la saturation aux heures de pointe.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { budget: -18, qol: -2 },
        narrative:
          "Le manque à gagner tarifaire contraint le report de deux programmes de renouvellement de matériel.",
        tone: "alerte",
      },
    ],
    excludes: ["mob-tarification-solidaire"],
    minYear: 2052,
  },
  {
    id: "mob-tarification-solidaire",
    track: "mobilite",
    title: "Tarification solidaire au quotient",
    ref: "MOB-15",
    line: "Indexer l'abonnement sur le quotient familial, gratuité sous le seuil.",
    upfront: 15,
    recurring: -3,
    immediate: { mobility: 3, trust: 4, qol: 2 },
    ongoing: { mobility: 0.6, trust: 0.4, budget: -0.4 },
    districtOngoing: { target: "residentiel", satisfaction: 0.4 },
    delayed: [
      {
        delay: 3,
        indicators: { mobility: 2, trust: 2, budget: 7 },
        narrative:
          "Les abonnements progressent de 26 % sans effondrement des recettes commerciales.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { trust: -2 },
        narrative:
          "La complexité des justificatifs écarte une partie des ayants droit, relevée par le rapport du médiateur.",
        tone: "negatif",
      },
    ],
    excludes: ["mob-gratuite-transports"],
  },
  {
    id: "mob-parcs-relais",
    track: "mobilite",
    title: "Parcs relais aux portes de la métropole",
    ref: "MOB-16",
    line: "Ouvrir 9 parcs relais aux terminus, tarif intégré au titre de transport.",
    upfront: 60,
    recurring: 3,
    immediate: { mobility: 4, qol: 1 },
    ongoing: { mobility: 0.8, carbon: -0.1, budget: 0.5 },
    districtOngoing: { target: "residentiel", pollution: -0.2 },
    delayed: [
      {
        delay: 3,
        indicators: { mobility: 2, budget: 14 },
        narrative:
          "Le taux d'occupation dépasse 80 % en semaine et les recettes couvrent l'entretien des ouvrages.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { biodiversity: -2, qol: -1 },
        narrative:
          "L'artificialisation des emprises de terminus est pointée par l'autorité environnementale.",
        tone: "negatif",
      },
    ],
  },
];

const CLIMAT: Decision[] = [
  {
    id: "cli-renaturation-berges",
    track: "climat",
    title: "Renaturation des berges du fleuve",
    ref: "CLI-01",
    line: "Déminéraliser 22 km de berges et rouvrir deux bras morts.",
    upfront: 60,
    recurring: -1,
    immediate: { biodiversity: 5, qol: 3 },
    ongoing: { biodiversity: 1.2, qol: 0.4, carbon: -0.08 },
    districtOngoing: { target: "humide", greenery: 0.8, pollution: -0.2 },
    delayed: [
      {
        delay: 4,
        indicators: { biodiversity: 3, qol: 2 },
        narrative:
          "Le retour des herbiers aquatiques est constaté sur dix-sept des vingt-deux kilomètres traités.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { budget: 9, qol: 2 },
        narrative:
          "La promenade fluviale devient le premier espace public fréquenté de la métropole.",
        tone: "positif",
      },
    ],
  },
  {
    id: "cli-canopee",
    track: "climat",
    title: "Plan canopée",
    ref: "CLI-02",
    line: "Planter 100 000 arbres et porter la canopée à 30 % de la surface urbaine.",
    upfront: 68,
    recurring: -1,
    immediate: { biodiversity: 4, qol: 3, carbon: -0.1 },
    ongoing: { biodiversity: 1, qol: 0.5, carbon: -0.12 },
    districtOngoing: { target: "all", greenery: 0.6 },
    delayed: [
      {
        delay: 3,
        indicators: { budget: -9, trust: -1 },
        narrative:
          "La sécheresse impose un arrosage d'urgence. Quatorze pour cent des jeunes plants sont perdus et replantés.",
        tone: "negatif",
      },
      {
        delay: 6,
        indicators: { qol: 4, biodiversity: 2 },
        narrative:
          "Les relevés montrent jusqu'à 4,2 °C d'écart entre rues plantées et rues nues en épisode caniculaire.",
        tone: "positif",
      },
    ],
  },
  {
    id: "cli-zones-humides",
    track: "climat",
    title: "Restauration des zones humides",
    ref: "CLI-03",
    line: "Reconquérir 900 hectares de marais en amont du delta.",
    upfront: 77,
    recurring: -1,
    immediate: { biodiversity: 6, carbon: -0.15 },
    ongoing: { biodiversity: 1.4, carbon: -0.15, qol: 0.2 },
    districtOngoing: { target: "humide", greenery: 1, density: -0.2 },
    delayed: [
      {
        delay: 3,
        indicators: { trust: -3 },
        narrative:
          "L'immobilisation de neuf cents hectares constructibles est contestée par les communes du sud du delta.",
        tone: "negatif",
      },
      {
        delay: 6,
        indicators: { qol: 4, budget: 27 },
        narrative:
          "Les marais restaurés absorbent la crue centennale : les dégâts sont divisés par trois.",
        tone: "positif",
      },
    ],
  },
  {
    id: "cli-parc-marais-phase2",
    track: "climat",
    title: "Parc naturel du delta, seconde phase",
    ref: "CLI-04",
    line: "Étendre la protection à 1 400 hectares et créer trois maisons du delta.",
    upfront: 51,
    recurring: -1,
    immediate: { biodiversity: 5, qol: 2, trust: 2 },
    ongoing: { biodiversity: 1.3, qol: 0.3 },
    districtOngoing: { target: "humide", greenery: 0.9, satisfaction: 0.3 },
    delayed: [
      {
        delay: 4,
        indicators: { biodiversity: 3, budget: 12 },
        narrative:
          "La fréquentation encadrée du delta finance l'entretien par la redevance d'accès.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { qol: -1, trust: -2 },
        narrative:
          "Les restrictions de chasse et de pêche traditionnelles cristallisent l'opposition des communes riveraines.",
        tone: "negatif",
      },
    ],
    requires: "cli-zones-humides",
    minYear: 2057,
  },
  {
    id: "cli-densification-douce",
    track: "climat",
    title: "Densification douce des faubourgs",
    ref: "CLI-05",
    line: "Autoriser deux niveaux de plus le long des axes desservis par le tramway.",
    upfront: 47,
    recurring: 3,
    immediate: { qol: -2, trust: -3, mobility: 1 },
    ongoing: { budget: 1.6, carbon: -0.1, mobility: 0.3 },
    districtOngoing: { target: "residentiel", density: 0.8, population: 900 },
    delayed: [
      {
        delay: 3,
        indicators: { trust: -4, qol: -2 },
        narrative:
          "Les collectifs de riverains obtiennent l'annulation de deux permis pour insuffisance d'étude d'ensoleillement.",
        tone: "negatif",
      },
      {
        delay: 5,
        indicators: { budget: 38, qol: 2 },
        narrative:
          "Onze mille logements sont livrés sans extension du périmètre urbanisé et les recettes fiscales suivent.",
        tone: "positif",
      },
      {
        delay: 7,
        indicators: { biodiversity: -2 },
        narrative:
          "La disparition des jardins d'îlot réduit la connectivité de la trame verte des faubourgs.",
        tone: "alerte",
      },
    ],
  },
  {
    id: "cli-agriculture-urbaine",
    track: "climat",
    title: "Ceinture maraîchère métropolitaine",
    ref: "CLI-06",
    line: "Acquérir 1 200 hectares en périphérie et installer 90 exploitations maraîchères.",
    upfront: 64,
    recurring: 4,
    immediate: { biodiversity: 3, qol: 2, trust: 2 },
    ongoing: { biodiversity: 0.6, qol: 0.3, budget: 0.5 },
    districtOngoing: { target: "mixte", greenery: 0.4 },
    delayed: [
      {
        delay: 4,
        indicators: { budget: 15, qol: 2 },
        narrative:
          "La restauration scolaire s'approvisionne à 45 % dans la ceinture et le coût du repas se stabilise.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { trust: -2, budget: -6 },
        narrative:
          "Un tiers des installations cesse l'activité avant la cinquième année. Les baux ruraux sont réattribués.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "cli-desimpermeabilisation",
    track: "climat",
    title: "Désimperméabilisation des sols publics",
    ref: "CLI-07",
    line: "Ouvrir 300 hectares de cours d'école, de parkings et de places au sol vivant.",
    upfront: 55,
    recurring: -1,
    immediate: { qol: 3, biodiversity: 3 },
    ongoing: { biodiversity: 0.7, qol: 0.4 },
    districtOngoing: { target: "all", greenery: 0.5, pollution: -0.2 },
    delayed: [
      {
        delay: 4,
        indicators: { qol: 3, budget: 18 },
        narrative:
          "Les épisodes de saturation du réseau unitaire reculent de moitié, les rejets d'orage également.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { qol: 2 },
        narrative:
          "Les cours désimperméabilisées deviennent des îlots de fraîcheur ouverts au quartier hors temps scolaire.",
        tone: "positif",
      },
    ],
  },
  {
    id: "cli-digue-portuaire",
    track: "climat",
    title: "Digue de protection du port",
    ref: "CLI-08",
    line: "Élever 9 km de digue et poser des portes anti-submersion au bassin nord.",
    upfront: 149,
    recurring: -1,
    immediate: { qol: 3, trust: 4, biodiversity: -3 },
    ongoing: { qol: 0.4, biodiversity: -0.4, budget: -0.3 },
    districtOngoing: { target: "portuaire", pollution: 0.1, satisfaction: 0.4 },
    delayed: [
      {
        delay: 5,
        indicators: { budget: 30, qol: 3 },
        narrative:
          "La tempête de l'hiver est contenue. Les dommages assurés du port sont dix fois inférieurs à ceux de 2051.",
        tone: "positif",
      },
      {
        delay: 7,
        indicators: { biodiversity: -3, budget: -12 },
        narrative:
          "L'ouvrage bloque le transit sédimentaire. Le rechargement des plages devient une dépense annuelle.",
        tone: "alerte",
      },
    ],
    excludes: ["cli-depolderisation"],
    minYear: 2053,
  },
  {
    id: "cli-depolderisation",
    track: "climat",
    title: "Dépoldérisation du sud du delta",
    ref: "CLI-09",
    line: "Reculer la ligne de défense et rendre 600 hectares à la marée.",
    upfront: 72,
    recurring: -1,
    immediate: { biodiversity: 6, trust: -4, qol: -1 },
    ongoing: { biodiversity: 1.5, carbon: -0.1 },
    districtOngoing: { target: "humide", greenery: 1.1, population: -120 },
    delayed: [
      {
        delay: 3,
        indicators: { trust: -4 },
        narrative:
          "Le relogement de quatre-vingts foyers de Basse-Rive s'étale sur trois ans et alimente un contentieux.",
        tone: "negatif",
      },
      {
        delay: 6,
        indicators: { qol: 3, budget: 24 },
        narrative:
          "L'estran reconstitué dissipe la houle de tempête. Basse-Rive sort de la zone d'aléa fort.",
        tone: "positif",
      },
    ],
    excludes: ["cli-digue-portuaire"],
    minYear: 2053,
  },
  {
    id: "cli-ilots-fraicheur",
    track: "climat",
    title: "Réseau d'îlots de fraîcheur",
    ref: "CLI-10",
    line: "Ouvrir 120 lieux rafraîchis et sept fontaines de quartier pour l'été.",
    upfront: 30,
    recurring: -1,
    immediate: { qol: 4, trust: 3 },
    ongoing: { qol: 0.7, trust: 0.3 },
    districtOngoing: { target: "residentiel", satisfaction: 0.5, greenery: 0.2 },
    delayed: [
      {
        delay: 3,
        indicators: { qol: 3, trust: 2 },
        narrative:
          "La surmortalité observée pendant la canicule reste inférieure d'un tiers à la moyenne nationale.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { budget: -6 },
        narrative:
          "La consommation d'eau des brumisateurs entre en conflit avec les arrêtés sécheresse préfectoraux.",
        tone: "alerte",
      },
    ],
  },
  {
    id: "cli-trame-noire",
    track: "climat",
    title: "Trame noire et corridors écologiques",
    ref: "CLI-11",
    line: "Rétablir 60 km de corridors non éclairés entre le delta et les coteaux.",
    upfront: 21,
    recurring: -3,
    immediate: { biodiversity: 4, energy: 1 },
    ongoing: { biodiversity: 0.9, energy: 0.2 },
    districtOngoing: { target: "humide", greenery: 0.4 },
    delayed: [
      {
        delay: 4,
        indicators: { biodiversity: 3 },
        narrative:
          "Les inventaires nocturnes recensent le retour de neuf espèces de chiroptères sur les corridors rétablis.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { trust: -1 },
        narrative:
          "Les demandes de réclairage émanant des communes traversées se multiplient après deux faits divers.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "cli-gestion-eau",
    track: "climat",
    title: "Renouvellement du réseau d'eau",
    ref: "CLI-12",
    line: "Remplacer 380 km de conduites et réutiliser les eaux traitées pour l'arrosage.",
    upfront: 119,
    recurring: -1,
    immediate: { qol: 2, biodiversity: 1 },
    ongoing: { qol: 0.4, budget: 1, biodiversity: 0.3 },
    districtOngoing: { target: "all", pollution: -0.2 },
    delayed: [
      {
        delay: 4,
        indicators: { budget: 31, qol: 2 },
        narrative:
          "Le rendement du réseau passe de 71 % à 91 % et le volume prélevé baisse d'un cinquième.",
        tone: "positif",
      },
      {
        delay: 7,
        indicators: { qol: 3, budget: 12 },
        narrative:
          "La métropole traverse la sécheresse sans restriction d'usage domestique.",
        tone: "positif",
      },
    ],
  },
  {
    id: "cli-collecte-biodechets",
    track: "climat",
    title: "Collecte séparée des biodéchets",
    ref: "CLI-13",
    line: "Généraliser la collecte des biodéchets et 600 points de compostage de quartier.",
    upfront: 34,
    recurring: 3,
    immediate: { biodiversity: 2, trust: 1, carbon: -0.1 },
    ongoing: { carbon: -0.1, biodiversity: 0.3, budget: 0.4 },
    districtOngoing: { target: "residentiel", pollution: -0.2 },
    delayed: [
      {
        delay: 3,
        indicators: { budget: 14, carbon: -0.1 },
        narrative:
          "Le tonnage incinéré recule de 18 % et la taxe sur les activités polluantes diminue d'autant.",
        tone: "positif",
      },
      {
        delay: 4,
        indicators: { qol: -2, trust: -2 },
        narrative:
          "Les points d'apport volontaire mal entretenus font l'objet de plaintes sanitaires dans quatre quartiers.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "cli-recyclage-avance",
    track: "climat",
    title: "Centre de tri et de valorisation avancée",
    ref: "CLI-14",
    line: "Construire un centre de tri optique et une unité de valorisation des plastiques.",
    upfront: 98,
    recurring: 5,
    immediate: { carbon: -0.15, biodiversity: 1 },
    ongoing: { carbon: -0.15, budget: 1.3 },
    districtOngoing: { target: "portuaire", pollution: -0.2 },
    delayed: [
      {
        delay: 4,
        indicators: { budget: 30 },
        narrative:
          "La vente de matières secondaires et la baisse des coûts d'enfouissement dégagent vingt millions de crédits par an.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { budget: -10, trust: -2 },
        narrative:
          "L'effondrement du cours des plastiques recyclés met la filière en déficit deux exercices de suite.",
        tone: "alerte",
      },
    ],
    requires: "cli-collecte-biodechets",
    minYear: 2056,
  },
  {
    id: "cli-economie-circulaire",
    track: "climat",
    title: "Réemploi des matériaux de construction",
    ref: "CLI-15",
    line: "Imposer le réemploi dans la commande publique et ouvrir deux plateformes de dépôt.",
    upfront: 26,
    recurring: 3,
    immediate: { carbon: -0.15, trust: 2 },
    ongoing: { carbon: -0.12, budget: 0.7, biodiversity: 0.2 },
    delayed: [
      {
        delay: 3,
        indicators: { budget: 16, carbon: -0.1 },
        narrative:
          "Le réemploi couvre 22 % des matériaux des chantiers métropolitains et abaisse le coût du gros œuvre.",
        tone: "positif",
      },
      {
        delay: 5,
        indicators: { trust: -2, budget: -5 },
        narrative:
          "Deux chantiers sont retardés par l'indisponibilité de lots réemployés conformes. Le surcoût est assumé.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "cli-refroidissement-urbain",
    track: "climat",
    title: "Réseau de froid urbain",
    ref: "CLI-16",
    line: "Alimenter le centre d'affaires en froid depuis le fleuve, sans groupes en toiture.",
    upfront: 106,
    recurring: -1,
    immediate: { energy: 3, qol: 3 },
    ongoing: { energy: 0.7, qol: 0.4, budget: 1, carbon: -0.1 },
    districtOngoing: { target: "affaires", energyUse: -0.6, pollution: -0.3 },
    delayed: [
      {
        delay: 4,
        indicators: { budget: 27, qol: 2 },
        narrative:
          "Le retrait des groupes froids en toiture abaisse de 1,8 °C la température nocturne du quartier d'affaires.",
        tone: "positif",
      },
      {
        delay: 6,
        indicators: { biodiversity: -2 },
        narrative:
          "Le rejet thermique dans le fleuve dépasse le seuil autorisé lors des étiages sévères.",
        tone: "alerte",
      },
    ],
    minYear: 2059,
  },
];

export const CATALOGUE: Decision[] = [...ENERGIE, ...MOBILITE, ...CLIMAT];
