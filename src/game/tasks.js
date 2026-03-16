const WORDS = ["chaos", "ignite", "spark", "tempo", "shuffle", "blitz"];

export function generateTask(players) {
  const alivePlayers = players.filter((p) => p.alive);
  const variants = ["tap", "math", "choose", "type"];
  const pick = variants[Math.floor(Math.random() * variants.length)];

  if (pick === "tap") {
    return {
      type: "tap",
      title: "Rapid Tap!",
      prompt: "Tap the button 20 times before the timer hits zero.",
      target: 20
    };
  }

  if (pick === "math") {
    const a = Math.floor(Math.random() * 9) + 2;
    const b = Math.floor(Math.random() * 9) + 2;
    return {
      type: "math",
      title: "Quick Math",
      prompt: `Solve: ${a} + ${b}`,
      answer: `${a + b}`
    };
  }

  if (pick === "choose") {
    const options = alivePlayers.slice(0, 6);
    return {
      type: "choose",
      title: "Choose The Next Victim",
      prompt: "Pick a player to pass the bomb.",
      options
    };
  }

  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  return {
    type: "type",
    title: "Type Sprint",
    prompt: `Type the word: ${word}`,
    word
  };
}
