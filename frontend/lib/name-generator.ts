export function generateRandomName(): string {
  const nouns = [
    "Panda",
    "Tiger",
    "Eagle",
    "Shark",
    "Lion",
    "Falcon",
    "Wolf",
    "Hawk",
    "Bear",
    "Owl",
    "Fox",
    "Raven",
    "Cobra",
    "Jaguar",
    "Dragon",
    "Phoenix",
    "Turtle",
    "Dolphin",
    "Bison",
    "Coyote",
    "Elephant",
    "Rhino",
  ];

  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 100);

  return `${noun}${number}`;
}
