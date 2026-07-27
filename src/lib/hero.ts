// Mode vitrine embarqué (?hero ou ?embed) : pour l'intégration en hero de
// portfolio. On saute l'intro « Prendre les commandes », on ne montre que la
// maquette 3D zoomée sur la ville, et elle reste manipulable (orbite, clic).
const params = new URLSearchParams(location.search);
export const HERO = params.has("hero") || params.has("embed");
