// Phaser stays out of the main chunk; a component cannot hold the import() (React Compiler bails).
export const loadCampusGame = () => import("./campusGame");
