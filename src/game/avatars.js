export function getRandomAvatar(playerName) {
  const seed = encodeURIComponent(playerName || crypto.randomUUID());
  return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}`;
}

export function getGhostAvatar(playerName) {
  const seed = encodeURIComponent(`${playerName || "ghost"}-ghost`);
  return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}`;
}
