// redistribute-answers.js

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
const outputFile = process.argv[3] || 'redistributed_quiz.json';

if (!inputFile) {
    console.error('Usage: node redistribute-answers.js <input-quiz.json> [output-quiz.json]');
    process.exit(1);
}

const fullInputPath = path.resolve(inputFile);
const fullOutputPath = path.resolve(outputFile);

try {
    const data = fs.readFileSync(fullInputPath, 'utf8');
    const quiz = JSON.parse(data);

    if (!Array.isArray(quiz)) {
        throw new Error('JSON file must contain an array of quiz questions');
    }

    const numQuestions = quiz.length;
    const options = ['a', 'b', 'c', 'd'];
    const targetCount = Math.floor(numQuestions / options.length);
    const extra = numQuestions % options.length;

    // Create assignment list: roughly equal positions
    let assignments = [];
    options.forEach(opt => {
        for (let i = 0; i < targetCount; i++) {
            assignments.push(opt);
        }
    });

    // Distribute extras
    for (let i = 0; i < extra; i++) {
        assignments.push(options[i]);
    };

    // Shuffle assignments to randomize which question gets which
    assignments = assignments.sort(() => Math.random() - 0.5);

    const newQuiz = quiz.map((q, index) => {
        // Find original correct text
        const origCorrectKey = q.correct;
        const correctText = q.answers.find(ans => ans.key === origCorrectKey)?.text;
        if (!correctText) {
            throw new Error(`Correct answer not found for question: ${q.question}`);
        }

        // Get wrong texts
        const wrongTexts = q.answers
            .filter(ans => ans.key !== origCorrectKey)
            .map(ans => ans.text);

        // Shuffle wrongs
        wrongTexts.sort(() => Math.random() - 0.5);

        // Target position for correct (e.g., 'b' -> index 1)
        const targetKey = assignments[index];
        const targetIndex = options.indexOf(targetKey);

        // Build new answers texts: insert correct at target, fill others with wrongs
        let newTexts = [];
        let wrongIdx = 0;
        for (let i = 0; i < options.length; i++) {
            if (i === targetIndex) {
                newTexts.push(correctText);
            } else {
                newTexts.push(wrongTexts[wrongIdx++]);
            }
        }

        // Create new answers objects
        const newAnswers = newTexts.map((text, i) => ({
            key: options[i],
            text
        }));

        // Return updated question
        return {
            ...q,
            answers: newAnswers,
            correct: targetKey
        };
    });

    // Write to output file
    fs.writeFileSync(fullOutputPath, JSON.stringify(newQuiz, null, 2), 'utf8');

    console.log(`Redistributed quiz saved to ${outputFile}`);
    console.log(`Target per option: ${targetCount} (with ${extra} extras distributed)`);

} catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
}