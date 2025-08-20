(() => {
  const YELLOW_HIGHLIGHT_CLASS = 'proposal-highlight';
  const RED_HIGHLIGHT_CLASS = 'red-highlight';
  const EXACT_PHRASE_CLASS = 'exact-phrase-highlight';
  const WORD_REGEX = /\bproposal\b/gi;
  // exact phrases will be loaded from storage; keep default for backward compatibility
  const DEFAULT_EXACT_PHRASES = ['Proposals: 5 to 10'];

  const SKIP_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'IFRAME',
    'CANVAS',
    'VIDEO',
    'AUDIO',
    'CODE',
    'PRE',
    'INPUT',
    'TEXTAREA',
    'SELECT'
  ]);

  function shouldSkipElement(element) {
    if (!element) return false;
    if (SKIP_TAGS.has(element.tagName)) return true;
    if (element.isContentEditable) return true;
    return element.closest &&
      (element.closest(`.${YELLOW_HIGHLIGHT_CLASS}`) ||
        element.closest(`.${RED_HIGHLIGHT_CLASS}`) ||
        element.closest(`.${EXACT_PHRASE_CLASS}`));
  }

  function highlightInTextNode(textNode, redWords, exactPhrases) {
    const parent = textNode.parentNode;
    if (!parent || shouldSkipElement(parent)) return;

    const text = textNode.nodeValue;
    const hasYellow = WORD_REGEX.test(text);
    const phrases = Array.isArray(exactPhrases) ? exactPhrases : [];
    const hasExactPhrase = phrases.some((p) => p && p.length > 0 && text.includes(p));
    const redRegex = buildRedWordsRegex(redWords);
    const hasRed = redRegex ? redRegex.test(text) : false;

    if (!text || !(hasYellow || hasExactPhrase || hasRed)) {
      return;
    }

    WORD_REGEX.lastIndex = 0;
    if (redRegex) redRegex.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    // We will create a combined list of match ranges across all patterns, then render once
    const ranges = [];

    while ((match = WORD_REGEX.exec(text)) !== null) {
      ranges.push({ start: match.index, end: WORD_REGEX.lastIndex, cls: YELLOW_HIGHLIGHT_CLASS });
    }

    for (const phrase of phrases) {
      if (!phrase || phrase.length === 0) continue;
      let from = 0;
      while (true) {
        const idx = text.indexOf(phrase, from);
        if (idx === -1) break;
        ranges.push({ start: idx, end: idx + phrase.length, cls: EXACT_PHRASE_CLASS });
        from = idx + phrase.length;
      }
    }

    if (redRegex) {
      let redMatch;
      while ((redMatch = redRegex.exec(text)) !== null) {
        ranges.push({ start: redMatch.index, end: redRegex.lastIndex, cls: RED_HIGHLIGHT_CLASS });
      }
    }

    // Sort ranges by start, then end
    ranges.sort((a, b) => (a.start - b.start) || (a.end - b.end));

    // Merge overlapping ranges, preferring exact phrase > red > yellow if overlaps
    const priority = {
      [EXACT_PHRASE_CLASS]: 3,
      [RED_HIGHLIGHT_CLASS]: 2,
      [YELLOW_HIGHLIGHT_CLASS]: 1
    };

    const merged = [];
    for (const r of ranges) {
      if (!merged.length) {
        merged.push({ ...r });
        continue;
      }
      const last = merged[merged.length - 1];
      if (r.start <= last.end) {
        // overlap
        if (priority[r.cls] >= priority[last.cls]) {
          // extend and replace class if higher priority
          last.end = Math.max(last.end, r.end);
          last.cls = r.cls;
        } else {
          last.end = Math.max(last.end, r.end);
        }
      } else {
        merged.push({ ...r });
      }
    }

    for (const r of merged) {
      if (r.start > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, r.start)));
      }
      const span = document.createElement('span');
      span.className = r.cls;
      span.textContent = text.slice(r.start, r.end);
      fragment.appendChild(span);
      lastIndex = r.end;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    parent.replaceChild(fragment, textNode);
  }

  function buildRedWordsRegex(redWords) {
    if (!Array.isArray(redWords) || redWords.length === 0) return null;
    const escaped = redWords
      .filter(Boolean)
      .map((w) => w.trim())
      .filter((w) => w.length > 0)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (escaped.length === 0) return null;
    return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
  }

  function walkAndHighlight(node, redWords, exactPhrases) {
    if (!node) return;

    // If this is a text node
    if (node.nodeType === Node.TEXT_NODE) {
      highlightInTextNode(node, redWords, exactPhrases);
      return;
    }

    // If this is an element node and should be skipped
    if (node.nodeType === Node.ELEMENT_NODE && shouldSkipElement(node)) {
      return;
    }

    // Walk children
    const childNodes = node.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      walkAndHighlight(childNodes[i], redWords, exactPhrases);
    }
  }

  function runInitialHighlight(redWords, exactPhrases) {
    walkAndHighlight(document.body, redWords, exactPhrases);
  }

  function setupObserver(redWords, exactPhrases) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((added) => {
            walkAndHighlight(added, redWords, exactPhrases);
          });
        } else if (mutation.type === 'characterData') {
          const target = mutation.target;
          if (target && target.nodeType === Node.TEXT_NODE) {
            highlightInTextNode(target, redWords, exactPhrases);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  function markSectionsWithExactPhrases() {
    const sections = document.querySelectorAll('.air3-card-section');
    sections.forEach(section => {
      const hasExactPhrase = section.querySelector('.' + EXACT_PHRASE_CLASS);
      if (hasExactPhrase) {
        section.classList.add('has-exact-phrase');
      } else {
        section.classList.remove('has-exact-phrase');
      }
    });
  }

  // Start observing after the initial highlight process
  function processAndObserve(redWords, exactPhrases) {
    markSectionsWithExactPhrases();

    const sectionObserver = new MutationObserver((mutations) => {
      let shouldProcess = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' ||
            (mutation.type === 'attributes' && mutation.attributeName === 'class')) {
          shouldProcess = true;
          break;
        }
      }
      if (shouldProcess) {
        markSectionsWithExactPhrases();
      }
    });

    sectionObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  function loadSettingsAndRun() {
    // defaults
    const defaults = { redWords: ['India'], exactPhrases: DEFAULT_EXACT_PHRASES };
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      run(defaults.redWords, defaults.exactPhrases);
      return;
    }
    chrome.storage.sync.get(defaults, (items) => {
      const redWords = Array.isArray(items.redWords) ? items.redWords : defaults.redWords;
      const exactPhrases = Array.isArray(items.exactPhrases) ? items.exactPhrases : defaults.exactPhrases;
      run(redWords, exactPhrases);
    });
  }

  function run(redWords, exactPhrases) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        runInitialHighlight(redWords, exactPhrases);
        setupObserver(redWords, exactPhrases);
        processAndObserve(redWords, exactPhrases);
      });
    } else {
      runInitialHighlight(redWords, exactPhrases);
      setupObserver(redWords, exactPhrases);
      processAndObserve(redWords, exactPhrases);
    }
  }

  loadSettingsAndRun();
})();
