import { extractQuizCards } from './data.ts';
import type { DocumentNode } from '../types.ts';
import { CONTENT_STYLE_CSS } from '../content_styles.ts';

const QUIZ_STYLE_CSS = `\
body {
  font-family: monospace, sans-serif;
  line-height: 1.6;
  margin: 0; padding: 0;
  background-color: #f4f4f9;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
}

.container {
  background-color: #fff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 600px;
  margin: 0 auto;
}

.word-label {
  font-size: 20px;
  color: #333;
  margin-bottom: 10px;
  white-space: pre-wrap;
  min-height: 28px;
}

.ipa-label {
  font-size: 18px;
  color: #666;
  margin-bottom: 20px;
}

.button-container {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.button {
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  border-radius: 5px;
  background-color: #1A90CE;
  color: #fff;
  cursor: pointer;
}

.count-label {
  font-size: 15px;
  color: gray;
  margin-bottom: 10px;
}

.trans-label {
  font-size: 20px;
  color: #333;
  margin-top: 10px;
  white-space: pre-wrap;
  word-break: break-all;
}

.section-content {
  white-space: pre-wrap;
  word-break: break-all;
}
${CONTENT_STYLE_CSS}

pre {
  background: #f0f2f5;
  padding: 0.5rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}
pre code {
  font-family: inherit;
  font-size: 0.9rem;
  color: #333;
}

.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(220, 220, 220, 0.7);
  -webkit-tap-highlight-color: transparent;
}
.modal-content {
  background-color: #ffffff;
  color: #000000;
  margin: 15% auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 10px;
  width: 80%;
  max-width: 500px;
  position: relative;
  box-shadow: 0 4px 8px 0 rgba(0,0,0,0.1), 0 6px 20px 0 rgba(0,0,0,0.08);
}
.modal-content h2 { margin-top: 0; }
.close-button {
  color: #666;
  float: right;
  font-size: 28px;
  font-weight: bold;
}
.close-button:hover, .close-button:focus {
  color: #000;
  text-decoration: none;
  cursor: pointer;
}
#level-content table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}
#level-content th, #level-content td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
#level-content th {
  background-color: #e9e9e9;
}
`;

const QUIZ_JS = `\
class QuizApp {
  constructor(cards) {
    this.cards = cards;
    this.currentIndex = 0;
    this.totalCards = cards.length;
    this.showingAnswer = false;
    if (this.totalCards === 0) {
      this.initUI();
      document.getElementById('word-label').textContent = 'No cards available';
      document.getElementById('count-label').textContent = 'Progress: 0/0';
      return;
    }
    this.randomizeCards();
    this.initUI();
    this.showCard();
  }

  initUI() {
    this.wordLabel = document.getElementById('word-label');
    this.ipaLabel = document.getElementById('ipa-label');
    this.transLabel = document.getElementById('trans-label');
    this.countLabel = document.getElementById('count-label');
    this.prevButton = document.getElementById('prev-button');
    this.nextButton = document.getElementById('next-button');
    this.answerButton = document.getElementById('answer-button');
    this.levelButton = document.getElementById('level-button');
    this.levelModal = document.getElementById('level-modal');
    this.levelContent = document.getElementById('level-content');
    this.closeModalButton = this.levelModal.querySelector('.close-button');

    this.prevButton.addEventListener('click', () => this.showPrev());
    this.nextButton.addEventListener('click', () => this.showNext());
    this.answerButton.addEventListener('click', () => this.showAnswer());
    this.levelButton.addEventListener('click', () => this.showHierarchy());
    this.closeModalButton.addEventListener('click', () => this.hideHierarchy());
    this.levelModal.addEventListener('click', (e) => {
      if (e.target === this.levelModal) this.hideHierarchy();
    });
    document.addEventListener('click', (e) => {
      if (!this.wordLabel || e.target.closest('button') || e.target.closest('.modal')) return;
      this.handleScreenTap();
    });
  }

  randomizeCards() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    this.currentIndex = 0;
  }

  showCard() {
    const card = this.cards[this.currentIndex];
    this.wordLabel.innerHTML = card.q;
    this.ipaLabel.innerHTML = '';
    this.transLabel.innerHTML = '';
    this.updateCount();
    this.showingAnswer = false;
  }

  showAnswer() {
    const card = this.cards[this.currentIndex];
    this.transLabel.innerHTML = card.a;
    this.showingAnswer = true;
  }

  showHierarchy() {
    const card = this.cards[this.currentIndex];
    if (!card.hierarchy || card.hierarchy.length === 0) {
      this.levelContent.innerHTML = '<p>No hierarchy</p>';
    } else {
      let tableHTML = '<table><tr><th>Level</th><th>Title</th></tr>';
      card.hierarchy.forEach(item => {
        tableHTML += '<tr><td>' + item.level + '</td><td>' + item.title + '</td></tr>';
      });
      tableHTML += '</table>';
      this.levelContent.innerHTML = tableHTML;
    }
    this.levelModal.style.display = 'block';
  }

  hideHierarchy() {
    this.levelModal.style.display = 'none';
  }

  showPrev() {
    this.currentIndex = (this.currentIndex - 1 + this.totalCards) % this.totalCards;
    this.showCard();
  }

  showNext() {
    this.currentIndex = (this.currentIndex + 1) % this.totalCards;
    this.showCard();
  }

  updateCount() {
    this.countLabel.textContent = 'Progress: ' + (this.currentIndex + 1) + '/' + this.totalCards;
  }

  handleScreenTap() {
    if (this.showingAnswer) this.showNext();
    else this.showAnswer();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof QUIZ_DATA !== 'undefined') new QuizApp(QUIZ_DATA);
});
`;

export function renderQuizDocument(doc: DocumentNode): string {
  const cards = extractQuizCards(doc);
  const dataJson = JSON.stringify(cards).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quiz</title>
  <link rel="stylesheet" href="assets/katex.min.css">
  <style>
${QUIZ_STYLE_CSS}
  </style>
</head>
<body>
  <div class="container">
    <div id="word-label" class="word-label"></div>
    <div id="ipa-label" class="ipa-label"></div>
    <div class="button-container">
      <button id="prev-button" class="button">↑</button>
      <button id="next-button" class="button">↓</button>
      <button id="level-button" class="button">Level</button>
      <button id="answer-button" class="button">Show</button>
    </div>
    <div id="count-label" class="count-label">Progress: 0/0</div>
    <div id="trans-label" class="trans-label"></div>
  </div>
  <div id="level-modal" class="modal">
    <div class="modal-content">
      <span class="close-button">×</span>
      <h2>Hierarchy</h2>
      <div id="level-content"></div>
    </div>
  </div>

  <script>const QUIZ_DATA = ${dataJson};</script>
  <script>${QUIZ_JS}</script>
</body>
</html>`;
}
