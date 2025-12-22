// perfect-format-quiz.js

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
const outputFile = process.argv[3] || 'perfect_quiz.json';

if (!inputFile) {
  console.error('Usage: node perfect-format-quiz.js <input.json> [output.json]');
  process.exit(1);
}

const inputPath = path.resolve(inputFile);
const outputPath = path.resolve(outputFile);

try {
  const data = fs.readFileSync(inputPath, 'utf8');
  const quiz = JSON.parse(data);

  if (!Array.isArray(quiz)) {
    throw new Error('File must contain a JSON array of questions');
  }

  // Build formatted string manually for full control
  let output = '[\n';

  quiz.forEach((q, index) => {
    const isLast = index === quiz.length - 1;

    output += '  {\n';
    output += `    "question": ${JSON.stringify(q.question)},\n`;
    output += '    "answers": [\n';

    q.answers.forEach((ans, i) => {
      const comma = i < q.answers.length - 1 ? ',' : '';
      output += `      { "key": "${ans.key}", "text": ${JSON.stringify(ans.text)} }${comma}\n`;
    });

    output += '    ],\n';
    output += `    "correct": "${q.correct}",\n`;
    output += `    "explanation": ${JSON.stringify(q.explanation)}\n`;
    output += `  }${isLast ? '' : ','}\n`;
  });

  output += ']';

  fs.writeFileSync(outputPath, output, 'utf8');

  console.log(`✅ Perfectly formatted quiz saved to: ${outputFile}`);
  console.log(`   Total questions: ${quiz.length}`);

} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}