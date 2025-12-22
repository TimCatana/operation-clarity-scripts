// count-answers.js

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node count-answers.js <quiz-file.json>');
  process.exit(1);
}

const fullPath = path.resolve(filePath);

try {
  const data = fs.readFileSync(fullPath, 'utf8');
  const quiz = JSON.parse(data);

  if (!Array.isArray(quiz)) {
    throw new Error('JSON file must contain an array of quiz questions');
  }

  const distribution = { a: 0, b: 0, c: 0, d: 0 };

  quiz.forEach(q => {
    if (q.correct && distribution.hasOwnProperty(q.correct)) {
      distribution[q.correct]++;
    }
  });

  console.log(`Answer distribution from ${filePath}:`);
  console.log(`a: ${distribution.a}`);
  console.log(`b: ${distribution.b}`);
  console.log(`c: ${distribution.c}`);
  console.log(`d: ${distribution.d}`);
  console.log(`\nTotal questions: ${quiz.length}`);

} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}