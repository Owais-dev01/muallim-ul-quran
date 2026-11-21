(() => {
  'use strict';
  const QUESTIONS = Array.isArray(window.QUIZ_QUESTIONS) ? window.QUIZ_QUESTIONS : [];
  const byId = new Map(QUESTIONS.map(q => [q.id, q]));
  const CATEGORIES = [
    { id: 'all', title: 'All questions', icon: '◈' },
    { id: 'pro', title: 'Advanced & exam', icon: '✦' },
    { id: 'vocab', title: 'Vocabulary', icon: 'أ' },
    { id: 'plural', title: 'Singular / Plural', icon: '♧' },
    { id: 'particles', title: 'Particles & phrases', icon: '⌘' },
    { id: 'pronouns', title: 'Pronouns', icon: '◎' },
    { id: 'verbs', title: 'Verb forms', icon: '↝' }
  ];
  const EXAM_PLAN = { pro: 16, verbs: 14, particles: 8, plural: 5, pronouns: 5, vocab: 2 };
  const EXAM_MINUTES = 45;
  const STORAGE_KEY = 'fehm-quran-v2';
  const $ = (id) => document.getElementById(id);
  function load() {
    try { const v = JSON.parse(localStorage.getItem(STORAGE_KEY)); return v && typeof v === 'object' ? v : {}; }
    catch (_) { return {}; }
  }
  let saved = load();
  let answers = saved.answers && typeof saved.answers === 'object' ? saved.answers : {};
  let flags = new Set(Array.isArray(saved.flags) ? saved.flags : []);
  let exam = saved.exam && Array.isArray(saved.exam.ids) && saved.exam.ids.length === 50 ? saved.exam : null;
  let mode = 'practice';
  let category = 'all';
  let query = '';
  let onlyUnanswered = false;
  let savedOnly = false;
  let showJustAnswered = null;
  let activeIndex = 0;
  let helpExpanded = false;
  const categoriesEl = $('categories');
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, flags: [...flags], exam })); }
    catch (_) { /* Some browsers disable storage; the quiz still works in this tab. */ }
  }
  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function textOnly(markup) {
    const el = document.createElement('div'); el.innerHTML = markup || '';
    return (el.textContent || '').replace(/\s+/g, ' ').toLowerCase();
  }
  function visibleQuestions() {
    if (mode === 'mock') return exam ? exam.ids.map(id => byId.get(id)).filter(Boolean) : [];
    return QUESTIONS.filter(q => (category === 'all' || q.cat === category)
      && (!onlyUnanswered || answers[q.id] === undefined || q.id === showJustAnswered)
      && (!savedOnly || flags.has(q.id))
      && (!query || textOnly(q.q + ' ' + q.tag + ' ' + q.opts.join(' ')).includes(query)));
  }
  function currentAnswers() { return mode === 'mock' ? (exam ? exam.answers : {}) : answers; }
  function simpleHint(q) {
    const h = textOnly(q.q + ' ' + q.tag);
    const hints = [];
    if (/kasrah|zer|زیر/.test(h)) hints.push('<b>Kasrah / zer (ـِ):</b> a short “i” sound under an Arabic letter.');
    if (/fatha|zabar|زبر/.test(h)) hints.push('<b>Fatha / zabar (ـَ):</b> a short “a” sound above an Arabic letter.');
    if (/dammah|pesh|پیش/.test(h)) hints.push('<b>Dammah / pesh (ـُ):</b> a short “u” sound above an Arabic letter.');
    if (/passive|مجہول/.test(h)) hints.push('<b>Passive:</b> the action is done to someone (e.g., “was created”), rather than by someone (“created”).');
    if (/imperative|command|الأمر/.test(h)) hints.push('<b>Imperative:</b> a command, such as “write!” or “read!”');
    if (/past.tense/.test(h)) hints.push('<b>Past tense:</b> the action already happened.');
    if (/present.tense/.test(h)) hints.push('<b>Present tense:</b> the action happens now or regularly.');
    if (/plural/.test(h)) hints.push('<b>Plural:</b> more than one. <b>Dual:</b> exactly two.');
    if (/pronoun/.test(h)) hints.push('<b>Pronoun:</b> a word like he, she, we, you, or they.');
    if (/possessive|“of”|of”/.test(h)) hints.push('<b>Possessive phrase:</b> a connection like “Book of Allah” (two nouns).');
    if (/adjective/.test(h)) hints.push('<b>Adjective:</b> a word that describes a noun, like “great” in “great reward.”');
    if (/prefix/.test(h)) hints.push('<b>Prefix:</b> letters added to the beginning of a word.');
    if (/suffix/.test(h)) hints.push('<b>Suffix:</b> letters added to the end of a word.');
    if (!hints.length) hints.push('Read the entire question first. Compare the Arabic forms and eliminate the choices that change the meaning, person, or tense.');
    return hints.slice(0, 3).join('<br>');
  }
  function updateOverview() {
    const done = QUESTIONS.filter(q => answers[q.id] !== undefined);
    const correct = done.filter(q => answers[q.id] === q.ans).length;
    $('overviewDone').textContent = done.length;
    $('overviewTotal').textContent = `/ ${QUESTIONS.length} practiced`;
    $('overviewCorrect').textContent = correct;
    $('overviewPercent').textContent = done.length ? `${Math.round(100 * correct / done.length)}% accuracy` : '0% accuracy';
    $('overviewBar').style.width = `${100 * done.length / (QUESTIONS.length || 1)}%`;
    $('headerCount').textContent = `${QUESTIONS.length} MCQs`;
  }
  function updateCategories() {
    categoriesEl.innerHTML = '';
    CATEGORIES.forEach(item => {
      const count = item.id === 'all' ? QUESTIONS.length : QUESTIONS.filter(q => q.cat === item.id).length;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'cat-button' + (category === item.id ? ' active' : '');
      btn.setAttribute('aria-pressed', String(category === item.id));
      btn.innerHTML = `<span class="cat-icon">${item.icon}</span><span>${item.title}</span><span class="cat-count">${count}</span>`;
      btn.addEventListener('click', () => { category = item.id; activeIndex = 0; showJustAnswered = null; helpExpanded = false; render(); });
      categoriesEl.appendChild(btn);
    });
  }
  function renderExamBanner() {
    const visible = mode === 'mock' && exam && !exam.done;
    $('examBanner').hidden = !visible;
    if (visible) tick();
    $('sidebar').hidden = mode === 'mock';
    document.querySelector('.workspace').classList.toggle('exam-active', mode === 'mock');
    $('practiceMode').classList.toggle('active', mode === 'practice');
    $('mockMode').classList.toggle('active', mode === 'mock');
  }
  function render() {
    updateOverview(); updateCategories(); renderExamBanner();
    if (mode === 'mock' && exam && exam.done) { showResults(); return; }
    const list = visibleQuestions();
    $('resultsPanel').hidden = true;
    $('emptyPanel').hidden = list.length !== 0;
    $('questionPanel').hidden = list.length === 0;
    $('navigation').hidden = list.length === 0;
    if (!list.length) return;
    activeIndex = Math.max(0, Math.min(activeIndex, list.length - 1));
    if (mode === 'mock' && exam) { exam.index = activeIndex; save(); }
    const q = list[activeIndex];
    const chosen = currentAnswers()[q.id];
    const answered = chosen !== undefined;
    const reveal = mode === 'practice' && answered;
    const answerCount = list.filter(q => currentAnswers()[q.id] !== undefined).length;
    const title = CATEGORIES.find(c => c.id === q.cat)?.title || 'Practice';
    $('topicBadge').textContent = title;
    $('questionId').textContent = `Question #${q.id}`;
    $('questionPosition').textContent = `Question ${activeIndex + 1} of ${list.length}`;
    $('answeredFraction').textContent = `${answerCount} answered`;
    $('questionProgress').style.width = `${100 * (activeIndex + 1) / list.length}%`;
    $('questionText').innerHTML = q.q;
    $('questionInstruction').textContent = mode === 'mock' ? 'Choose one option. Answers are revealed after submission.' : (q.plain || 'Choose the best answer below.');
    const mark = flags.has(q.id);
    $('bookmarkBtn').classList.toggle('saved', mark);
    $('bookmarkBtn').textContent = mark ? '★ Saved' : '☆ Save';
    $('bookmarkBtn').setAttribute('aria-pressed', String(mark));
    const choices = $('optionList'); choices.innerHTML = '';
    q.opts.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'answer'; btn.setAttribute('aria-label', `Option ${i + 1}: ${textOnly(opt)}`);
      if (reveal && i === q.ans) btn.classList.add('correct');
      if (reveal && chosen === i && chosen !== q.ans) btn.classList.add('wrong');
      if (mode === 'mock' && chosen === i) btn.classList.add('picked');
      btn.disabled = reveal;
      btn.innerHTML = `<span class="letter">${String.fromCharCode(65 + i)}</span><span>${opt}</span>`;
      btn.addEventListener('click', () => answer(q.id, i));
      choices.appendChild(btn);
    });
    $('explanation').hidden = !reveal;
    if (reveal) {
      $('explanation').classList.toggle('bad', chosen !== q.ans);
      $('explanation').innerHTML = `<strong>${chosen === q.ans ? '✓ Correct! Here is why:' : 'Not quite. Here is why:'}</strong>${q.exp}`;
    }
    $('helpText').innerHTML = simpleHint(q);
    $('helpText').hidden = !helpExpanded;
    $('helpBtn').setAttribute('aria-expanded', String(helpExpanded));
    $('helpBtn').textContent = helpExpanded ? '− Hide simple explanation of terms' : 'ⓘ Need help understanding the terms?';
    $('prevBtn').disabled = activeIndex === 0;
    $('nextBtn').textContent = mode === 'mock' && activeIndex === list.length - 1 ? 'Submit exam →' : activeIndex === list.length - 1 ? 'Back to first ↺' : 'Next question →';
    $('navHint').textContent = mode === 'mock' ? 'Answers hidden until you finish' : (answered ? (chosen === q.ans ? 'Correct answer!' : 'Explanation is shown above') : 'Pick an answer or skip');
    $('skipBtn').textContent = 'Skip for now';
  }
  function answer(id, option) {
    if (mode === 'mock') {
      if (!exam || exam.done || Date.now() >= exam.endAt) return;
      exam.answers[id] = option;
    } else {
      if (answers[id] !== undefined) return;
      answers[id] = option;
      showJustAnswered = onlyUnanswered ? id : null;
    }
    save(); render();
  }
  function gotoIndex(requestedIndex) {
    // Keep the selected question in view after an Unanswered-only question is answered.
    const before = visibleQuestions();
    const target = before[requestedIndex]?.id;
    showJustAnswered = null;
    const after = visibleQuestions();
    activeIndex = target ? after.findIndex(q => q.id === target) : 0;
    if (activeIndex < 0) activeIndex = 0;
    helpExpanded = false; render(); scrollToQuestion();
  }
  function next(delta) {
    const list = visibleQuestions();
    if (!list.length) return;
    if (delta > 0 && activeIndex === list.length - 1) {
      if (mode === 'mock') { submitExam(); return; }
      gotoIndex(0); return;
    }
    gotoIndex(Math.max(0, Math.min(list.length - 1, activeIndex + delta)));
  }
  function scrollToQuestion() {
    if (window.matchMedia('(max-width: 720px)').matches) $('questionPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function skip() {
    const list = visibleQuestions();
    if (!list.length) return;
    let nextIndex = -1;
    for (let offset = 1; offset <= list.length; offset++) {
      const candidate = (activeIndex + offset) % list.length;
      if (currentAnswers()[list[candidate].id] === undefined) { nextIndex = candidate; break; }
    }
    gotoIndex(nextIndex >= 0 ? nextIndex : (activeIndex + 1) % list.length);
  }
  function newExam() {
    let selected = [];
    Object.entries(EXAM_PLAN).forEach(([cat, count]) => {
      selected = selected.concat(shuffle(QUESTIONS.filter(q => q.cat === cat)).slice(0,count).map(q => q.id));
    });
    if (selected.length !== 50) { alert('Could not create a 50-question mock.'); return; }
    exam = { ids: shuffle(selected), answers: {}, index: 0, startAt: Date.now(), endAt: Date.now() + EXAM_MINUTES * 60 * 1000, done: false };
    mode = 'mock'; activeIndex = 0; helpExpanded = false; save(); render();
  }
  function chooseMock() {
    if (mode === 'mock' && exam && !exam.done) return;
    if (exam && !exam.done && exam.endAt > Date.now()) {
      mode = 'mock'; activeIndex = exam.index || 0; helpExpanded = false; render(); return;
    }
    newExam();
  }
  function choosePractice() {
    mode = 'practice'; activeIndex = 0; helpExpanded = false; render();
  }
  function submitExam() {
    if (!exam || exam.done) return;
    const outstanding = exam.ids.filter(id => exam.answers[id] === undefined).length;
    const message = outstanding ? `You still have ${outstanding} unanswered question(s). Submit now?` : 'Submit your exam and see the results?';
    if (!confirm(message)) return;
    finishExam();
  }
  function finishExam() { if (!exam || exam.done) return; exam.done = true; exam.finishedAt = Date.now(); save(); render(); }
  function tick() {
    if (mode !== 'mock' || !exam || exam.done) return;
    const left = Math.max(0, Math.ceil((exam.endAt - Date.now()) / 1000));
    $('timer').textContent = `${String(Math.floor(left / 60)).padStart(2,'0')}:${String(left % 60).padStart(2,'0')}`;
    $('examBanner').classList.toggle('urgent', left <= 5 * 60);
    if (left === 0) finishExam();
  }
  function showResults() {
    const list = visibleQuestions();
    const correct = list.filter(q => exam.answers[q.id] === q.ans).length;
    const attempted = list.filter(q => exam.answers[q.id] !== undefined).length;
    const missed = list.filter(q => exam.answers[q.id] !== q.ans);
    const elapsed = Math.max(0, Math.floor(((exam.finishedAt || Date.now()) - exam.startAt) / 1000));
    const time = `${Math.floor(elapsed/60)}m ${elapsed%60}s`;
    $('questionPanel').hidden = true; $('emptyPanel').hidden = true; $('navigation').hidden = true; $('resultsPanel').hidden = false;
    const result = $('resultsPanel');
    result.innerHTML = `<div class="results-head"><div class="results-icon">✓</div><h2>Mock exam complete</h2><p>${correct >= 40 ? 'Strong work. Keep practicing the areas you missed.' : 'Good practice. Review your mistakes and try again.'}</p></div>
    <div class="results-grid"><div><b>${correct} / ${list.length}</b><span>Correct answers</span></div><div><b>${Math.round(100 * correct / list.length)}%</b><span>Final score</span></div><div><b>${attempted}</b><span>Attempted in ${time}</span></div></div>
    <div class="result-actions"><button type="button" id="againBtn" class="action-primary">Try a new mock</button><button type="button" id="backPracticeBtn" class="action-secondary">Return to practice</button></div>
    <h3 class="review-heading">Review ${missed.length} missed / unanswered questions</h3>
    <div id="reviewItems"></div>`;
    const review = $('reviewItems');
    if (!missed.length) review.innerHTML = '<p>Excellent — no mistakes in this mock exam.</p>';
    missed.forEach(q => {
      const chosen = exam.answers[q.id];
      const item = document.createElement('div'); item.className = 'review-item';
      item.innerHTML = `<span class="mini-topic">${CATEGORIES.find(c => c.id === q.cat)?.title || 'Practice'} · Question #${q.id}</span><div class="mini-q">${q.q}</div>
        ${chosen === undefined ? '<div class="mini-selected">Not answered</div>' : `<div class="mini-selected">Your answer: ${q.opts[chosen]}</div>`}
        <div class="mini-answer"><b>Correct answer:</b> ${q.opts[q.ans]}</div><p>${q.exp}</p>`;
      review.appendChild(item);
    });
    $('againBtn').addEventListener('click', () => { if (confirm('Start a new 50-question timed mock?')) newExam(); });
    $('backPracticeBtn').addEventListener('click', choosePractice);
  }
  $('practiceMode').addEventListener('click', choosePractice);
  $('mockMode').addEventListener('click', chooseMock);
  $('prevBtn').addEventListener('click', () => next(-1));
  $('nextBtn').addEventListener('click', () => next(1));
  $('skipBtn').addEventListener('click', skip);
  $('bookmarkBtn').addEventListener('click', () => {
    const q = visibleQuestions()[activeIndex]; if (!q) return;
    if (flags.has(q.id)) flags.delete(q.id); else flags.add(q.id);
    save(); render();
  });
  $('helpBtn').addEventListener('click', () => {helpExpanded = !helpExpanded;render();});
  $('search').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); activeIndex = 0; showJustAnswered = null; render(); });
  $('unansweredOnly').addEventListener('change', e => { onlyUnanswered = e.target.checked; activeIndex = 0; showJustAnswered = null; render(); });
  $('savedOnly').addEventListener('change', e => { savedOnly = e.target.checked; activeIndex = 0; showJustAnswered = null; render(); });
  $('randomBtn').addEventListener('click', () => {
    const list = visibleQuestions(); if (!list.length) return;
    activeIndex = Math.floor(Math.random() * list.length); helpExpanded = false; render(); scrollToQuestion();
  });
  $('resetBtn').addEventListener('click', () => { if (confirm('Remove all saved practice answers? Your mock history is not affected.')) { answers = {}; showJustAnswered=null; save(); render(); } });
  $('clearFilters').addEventListener('click', () => {category='all'; query=''; onlyUnanswered=false; savedOnly=false; showJustAnswered=null; $('search').value=''; $('unansweredOnly').checked=false; $('savedOnly').checked=false; activeIndex=0;render();});
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
    if (e.key >= '1' && e.key <= '4' && !$('questionPanel').hidden) {
      const q = visibleQuestions()[activeIndex]; if (q && Number(e.key)-1 < q.opts.length) answer(q.id,Number(e.key)-1);
    } else if (e.key === 'ArrowRight') next(1);
    else if (e.key === 'ArrowLeft') next(-1);
  });
  if (!QUESTIONS.length) {
    $('questionText').textContent = 'Question bank could not load. Make sure questions.js is present.';
  } else {
    updateOverview();render();setInterval(tick, 1000);
  }
})();
