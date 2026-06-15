export const PARAGRAPHS = [
  "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle. As with all matters of the heart, you'll know when you find it.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. It is easy to stand with the crowd. It takes courage to stand alone.",
  "In the middle of difficulty lies opportunity. The measure of intelligence is the ability to change. Imagination is more important than knowledge.",
  "A journey of a thousand miles begins with a single step. The best time to plant a tree was twenty years ago. The second best time is now.",
  "We are what we repeatedly do. Excellence, then, is not an act, but a habit. Knowing yourself is the beginning of all wisdom.",
  "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment. Dare to live the life you have dreamed for yourself.",
  "The future belongs to those who believe in the beauty of their dreams. Go confidently in the direction of your dreams. Live the life you have imagined.",
  "Code is like humor. When you have to explain it, it's bad. First, solve the problem. Then, write the code. Simplicity is the soul of efficiency.",
  "All code should be clean and readable. Comments should explain why, not what. Writing code is easy, but writing maintainable systems is an art form that takes years to master.",
  "The exploration of space will go ahead, whether we join in it or not, and it is one of the great adventures of all time, and no nation can expect to remain leader of other nations.",
  "Deep learning is a subset of machine learning, which is essentially a neural network with three or more layers. These neural networks attempt to simulate the behavior of the human brain.",
  "JavaScript is a scripting language that enables you to create dynamically updating content, control multimedia, animate images, and pretty much everything else."
];

export function getRandomParagraph() {
  const index = Math.floor(Math.random() * PARAGRAPHS.length);
  return PARAGRAPHS[index];
}
