(function () {
  const DEFAULTS = { redWords: ['India'], exactPhrases: ['Proposals: 5 to 10'] };

  const wordsInput = document.getElementById('wordsInput');
  const saveBtn = document.getElementById('saveBtn');
  const wordsList = document.getElementById('wordsList');
  const exactPhrasesInput = document.getElementById('exactPhrasesInput');
  const phrasesList = document.getElementById('phrasesList');

  function renderWords(words) {
    const list = Array.isArray(words) ? words : [];
    if (list.length === 0) {
      wordsList.innerHTML = '<div class="hint">No words saved.</div>';
      return;
    }
    const pills = list
      .map((w) => `<span class="word-pill">${escapeHtml(w)}</span>`)
      .join(' ');
    wordsList.innerHTML = pills;
  }

  function renderPhrases(phrases) {
    const list = Array.isArray(phrases) ? phrases : [];
    if (list.length === 0) {
      phrasesList.innerHTML = '<div class="hint">No phrases saved.</div>';
      return;
    }
    const pills = list
      .map((p) => `<span class="word-pill" style="background:#dbefdc;border-color:#b9e5bf;">${escapeHtml(p)}</span>`)
      .join(' ');
    phrasesList.innerHTML = pills;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseInputToWords(text) {
    // Now splits by lines instead of commas
    return text
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w.length > 0)
      .filter((w, i, arr) => arr.indexOf(w) === i);
  }

  function parseTextareaToPhrases(text) {
    return text
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
  }

  function load() {
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      renderWords(DEFAULTS.redWords);
      renderPhrases(DEFAULTS.exactPhrases);
      return;
    }
    chrome.storage.sync.get(DEFAULTS, (items) => {
      renderWords(items.redWords);
      renderPhrases(items.exactPhrases);
      wordsInput.value = (items.redWords || []).join('\n');
      exactPhrasesInput.value = (items.exactPhrases || []).join('\n');
    });
  }

  function save() {
    const words = parseInputToWords(wordsInput.value);
    const phrases = parseTextareaToPhrases(exactPhrasesInput.value);
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      renderWords(words);
      renderPhrases(phrases);
      return;
    }
    chrome.storage.sync.set({ redWords: words, exactPhrases: phrases }, () => {
      renderWords(words);
      renderPhrases(phrases);
      saveBtn.textContent = 'Saved!';
      setTimeout(() => (saveBtn.textContent = 'Save'), 1000);
    });
  }

  saveBtn.addEventListener('click', save);
  document.addEventListener('DOMContentLoaded', load);
  load();
})();
