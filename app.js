// app.js
(() => {
  // Helpers
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const getParam = (name) => new URLSearchParams(location.search).get(name);

  const setId = getParam('set') || 1;
  const lessonId = getParam('lesson') || 1;

  // Elements
  const pageTitle = qs('#page-title');
  const conversationEl = qs('#conversation');
  const reviewGrid = qs('#review-grid');
  const testConversation = qs('#test-conversation');

  const tabLesson = qs('#tab-lesson');
  const tabReview = qs('#tab-review');
  const tabTest = qs('#tab-test');

  const viewLesson = qs('#view-lesson');
  const viewReview = qs('#view-review');
  const viewTest = qs('#view-test');

  const goReviewBtn = qs('#go-review');
  const goTestBtn = qs('#go-test');

  const checkReviewBtn = qs('#check-review');
  const checkTestBtn = qs('#check-test');

  const congratsModal = qs('#congrats-modal');
  const congratsText = qs('#congrats-text');
  const closeCongrats = qs('#close-congrats');

  // Load data file
  const dataPath = `data/set${setId}_lesson${lessonId}.json`;
  fetch(dataPath)
    .then(r => {
      if (!r.ok) throw new Error('Không tìm thấy file: ' + dataPath);
      return r.json();
    })
    .then(data => init(data))
    .catch(err => {
      conversationEl.innerHTML = `<p class="muted">Lỗi tải dữ liệu: ${err.message}</p>`;
      console.error(err);
    });

  function init(data) {
    pageTitle.textContent = data.title || `Set ${setId} - Bài ${lessonId}`;

    const words = data.tuvung || [];
    const convLines = data.conversation || [];

    // Render conversation with full words (for Lesson view)
    const convHTML = convLines.map(line => {
      return line.replace(/\{(\d+)\}/g, (m, idx) => {
        const w = words[+idx];
        if (!w) return m;
        return `<b>${escapeHtml(w.tuvung)}</b> <span class="muted">(${w.dongnghia.join(', ')})</span>`;
      });
    }).map(t => `<p>${t}</p>`).join('\n');
    conversationEl.innerHTML = convHTML;

    // Build Review grid: each word -> card with meaning, pos, hint and input
    reviewGrid.innerHTML = words.map((w, i) => {
      const hints = w.dongnghia && w.dongnghia.length ? `(${w.dongnghia.join(', ')})` : '';
      return `
        <div class="review-item">
          <p>${escapeHtml(w.tuvung)} <span class="muted">· ${escapeHtml(w.loaitu)}</span></p>
          <div class="muted" style="font-size:13px;margin-bottom:8px">${escapeHtml(w.nghiatiengviet)} ${hints}</div>
          <input class="input-word" data-index="${i}" placeholder="Nhập từ..." />
        </div>
      `;
    }).join('');

    // Bind input checking for review (live)
    qsa('.input-word').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = +inp.dataset.index;
        checkInputAgainstWord(inp, words[idx]);
      });
    });

    // Build test conversation: replace {i} by input blanks
    testConversation.innerHTML = convLines.map((line, li) => {
    // Replace từng chỗ {i} bằng input và hiển thị hint dưới input
    let replaced = line.replace(/\{(\d+)\}/g, (m, idx) => {
      const word = words[+idx];
      const hintText = word && word.hint ? word.hint : (word && word.dongnghia && word.dongnghia.length ? word.dongnghia.join(', ') : '');
      return `
        <div class="test-item" style="display:inline-block; margin-right:12px; vertical-align:top;">
          <input class="blank-input" data-index="${idx}" placeholder="___" style="display:block; width:120px; margin-bottom:4px;" autocomplete="off" />
          <small style="color:#666; font-style: italic; font-size:0.85rem;">${escapeHtml(hintText)}</small>
        </div>
      `;
    });
    return `<p>${escapeHtmlSpeaker(replaced)}</p>`;
  }).join('\n');

    // Tab handlers
    tabLesson.onclick = () => showView('lesson');
    tabReview.onclick = () => showView('review');
    tabTest.onclick = () => showView('test');

    goReviewBtn.onclick = () => showView('review');
    goTestBtn.onclick = () => showView('test');
    qs('#back-to-lesson').onclick = () => showView('lesson');
    qs('#back-to-lesson-2').onclick = () => showView('lesson');

    // Check review whole
    checkReviewBtn.onclick = () => {
      const inputs = qsa('.input-word');
      let correctCount = 0;
      inputs.forEach(inp => {
        const idx = +inp.dataset.index;
        if (checkInputAgainstWord(inp, words[idx])) correctCount++;
      });
      if (correctCount === inputs.length && inputs.length>0) {
        showCongrats(`Bạn đã trả lời đúng ${correctCount}/${inputs.length}. Tuyệt vời!`);
      } else {
        showCongrats(`Bạn trả lời đúng ${correctCount}/${inputs.length}. Cố tiếp nhé!`);
      }
    };

    // Check test conversation
    checkTestBtn.onclick = () => {
      const inputs = qsa('.blank-input');
      let correct = 0;
      inputs.forEach(inp => {
        const idx = +inp.dataset.index;
        const userVal = inp.value.trim();
        const w = words[idx];
        if (isMatch(userVal, w)) {
          inp.classList.remove('incorrect');
          inp.classList.add('correct');
          correct++;
        } else {
          inp.classList.remove('correct');
          if (userVal.length>0) inp.classList.add('incorrect');
          else inp.classList.remove('incorrect');
        }
      });
      if (correct === inputs.length && inputs.length>0) {
        showCongrats(`Bạn đã hoàn thành bài kiểm tra hội thoại — ${correct}/${inputs.length} đúng!`);
      } else {
        showCongrats(`Kết quả: ${correct}/${inputs.length}. Thử lại để đạt điểm tối đa nhé!`);
      }
    };

    closeCongrats.onclick = () => {
      hideCongrats();
    };

    // utility: show starting view
    showView('lesson');
  }

  // ========== helper functions ==========

  function showView(name) {
    // tabs state
    tabLesson.classList.toggle('active', name==='lesson');
    tabReview.classList.toggle('active', name==='review');
    tabTest.classList.toggle('active', name==='test');

    // views
    viewLesson.style.display = (name==='lesson') ? 'block' : 'none';
    viewReview.style.display = (name==='review') ? 'block' : 'none';
    viewTest.style.display = (name==='test') ? 'block' : 'none';
  }

  function checkInputAgainstWord(inputEl, wordObj) {
    const val = inputEl.value.trim();
    if (val.length === 0) {
      inputEl.classList.remove('correct','incorrect');
      return false;
    }
    if (isMatch(val, wordObj)) {
      inputEl.classList.add('correct');
      inputEl.classList.remove('incorrect');
      return true;
    } else {
      inputEl.classList.remove('correct');
      inputEl.classList.add('incorrect');
      return false;
    }
  }

  // match against tuvung or any dongnghia (case-insensitive)
  function isMatch(userVal, wordObj) {
    const norm = s => (s||'').toString().trim().toLowerCase();
    if (!userVal) return false;
    const u = norm(userVal);
    if (u === norm(wordObj.tuvung)) return true;
    if (Array.isArray(wordObj.dongnghia)) {
      for (let d of wordObj.dongnghia) if (u === norm(d)) return true;
    }
    return false;
  }

  // show congrats modal with small confetti
  function showCongrats(text) {
    congratsText.textContent = text;
    const modal = congratsModal;
    modal.classList.remove('hidden');

    // create confetti pieces
    const confetti = qs('#confetti');
    confetti.innerHTML = '';
    const colors = ['#ff6b6b','#ffd166','#4ecdc4','#2bb673','#7f8cff','#ff7ab6'];
    for (let i=0;i<28;i++){
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = (5 + Math.random()*90) + '%';
      p.style.background = colors[Math.floor(Math.random()*colors.length)];
      p.style.transform = `rotate(${Math.random()*360}deg)`;
      p.style.animationDelay = (Math.random()*200) + 'ms';
      p.style.top = (Math.random()*10) + 'px';
      confetti.appendChild(p);
    }

    // hide modal after 3.2s automatically
    setTimeout(()=>{ if (!modal.classList.contains('hidden')) hideCongrats(); }, 3800);
  }
  function hideCongrats(){ congratsModal.classList.add('hidden'); qs('#confetti').innerHTML=''; }

  // escape helper
  function escapeHtml(str){
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  // when we built test conversation replaced with inputs and we want to keep original speaker text; escape but allow inputs (we pass already built markup) -> simply return string
  function escapeHtmlSpeaker(str){ return str; }
})();
