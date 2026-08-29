(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const screens = new Map($$('.screen').map(screen => [screen.id, screen]));
  const audio = $('#storyAudio');
  const toastElement = $('#toast');
  const historyStack = ['s-family'];
  let currentScreen = 's-family';
  let roleContext = 'family';
  let toastTimer = 0;
  let createStep = 0;
  let interviewIndex = 0;
  let revealedInterviewCount = 1;
  let bookPage = 0;
  let bookTurning = false;
  // 已实际播放过回答原声的轮数（供确认页状态徽标使用）
  let recordedRounds = 0;
  // 各屏的上一次来源（供返回键与导航高亮做来源感知）
  const sourceOf = {};

  function syncQuestionUI() {
    const value = (askState.question || '').trim() || interview[0].question;
    $('#inviteQuestion').textContent = `“${value}”`;
    $('#elderQuestionText').textContent = `“${value}”`;
    $('#familyQuestionText').textContent = value;
  }

  function updateConfirmState() {
    const badge = $('#confirmStateBadge');
    if (!badge) return;
    if (recordedRounds > 0) {
      let seconds = 0;
      for (let index = 0; index < recordedRounds; index += 1) seconds += interview[index].answerDuration;
      badge.textContent = `已录制 ${recordedRounds}/8 轮原声 · ${formatTime(seconds)}`;
      badge.classList.remove('status-pill--info');
      badge.classList.add('status-pill--warm');
    } else {
      badge.textContent = '演示直入 · 尚未录制原声';
      badge.classList.add('status-pill--info');
      badge.classList.remove('status-pill--warm');
    }
  }

  // 返回目标：人生之书固定回家馆，其余页面按来源返回
  function updateBackTargets(id) {
    const homeBack = $('#s-home [aria-label="返回家人首页"]');
    if (id === 's-home' && homeBack) homeBack.dataset.go = sourceOf['s-home'] === 's-elder-home' ? 's-elder-home' : 's-family';
    const customBack = $('#s-book-customize [aria-label="返回阅读"]');
    if (id === 's-book-customize' && customBack) customBack.dataset.go = sourceOf['s-book-customize'] === 's-me' ? 's-me' : 's-book';
  }

  // 8 轮问答：文本来自《文本问答集合.txt》，语音为素材包中 16 段 24kHz 原声（问=鲁小豫，答=陈老先生）
  const interview = [
    {
      question: '您先看看，站在文儒坊门洞旁边的这个人，是您吗？',
      answer: '是我。那时候大概五十岁，头发还没怎么白。照片是我女儿拍的，她从亲戚那里借来一台相机，说一定要在文儒坊门口给我留一张。',
      questionAudio: 'assets/interview/q1.wav', questionDuration: 4.3,
      answerAudio: 'assets/interview/a1.wav', answerDuration: 15.4
    },
    {
      question: '女儿为什么特别想在这个门口给您拍照？',
      answer: '她那年准备去外地读书。我们家虽然不在门洞正对面，但每天进进出出都要经过这里。她说以后想家的时候，看见这个门，就知道家在后面。',
      questionAudio: 'assets/interview/q2.wav', questionDuration: 3.7,
      answerAudio: 'assets/interview/a2.wav', answerDuration: 19.4
    },
    {
      question: '您那时候每天经过这道门，通常是去做什么？',
      answer: '早上出去买菜，上班也从这里走。女儿小时候上学，我还会送她到巷口。晚上回来，远远看见“文儒坊”三个字，心里就知道到家了。',
      questionAudio: 'assets/interview/q3.wav', questionDuration: 4.5,
      answerAudio: 'assets/interview/a3.wav', answerDuration: 14.7
    },
    {
      question: '您刚说早上出去买菜，那时文儒坊一早最先听见的是什么声音？',
      answer: '先是各家开木门的声音，接着是自行车铃，还有卖菜人推车经过石板路的声音。巷子不宽，谁家起来得早，附近几户人都听得见。',
      questionAudio: 'assets/interview/q4.wav', questionDuration: 5.1,
      answerAudio: 'assets/interview/a4.wav', answerDuration: 15.2
    },
    {
      question: '照片里的墙面有不少水痕，下雨时这段路好走吗？',
      answer: '青石板一沾水就有点滑。大家走得慢，碰见老人还会提醒一句。雨大的时候，水顺着屋檐往下滴，走到门洞这里，雨声会突然变得特别响。',
      questionAudio: 'assets/interview/q5.wav', questionDuration: 4.2,
      answerAudio: 'assets/interview/a5.wav', answerDuration: 13.0
    },
    {
      question: '您说街坊见面会互相提醒，当时谁最常坐在门口和大家说话？',
      answer: '隔壁有位林依姆，天气好的时候常坐在门边择菜。孩子放学回来，她一眼就认得是谁家的。哪家大人回来晚，她也会帮忙看着孩子一会儿。',
      questionAudio: 'assets/interview/q6.wav', questionDuration: 5.9,
      answerAudio: 'assets/interview/a6.wav', answerDuration: 16.0
    },
    {
      question: '后来再回到文儒坊，您最先发现什么变了？',
      answer: '房子修整过了，路也比以前干净，来参观的人多了。以前这里首先是大家生活的地方，现在大家更愿意停下来看看它的历史。',
      questionAudio: 'assets/interview/q7.wav', questionDuration: 3.7,
      answerAudio: 'assets/interview/a7.wav', answerDuration: 17.0
    },
    {
      question: '如果把这张照片留给晚辈，您最想让他们知道什么？',
      answer: '我想让他们知道，我们记住一个地方，不只是记住一块牌匾或者一座老房子。每天从这里走过、碰见什么人、听见什么声音，这些普通日子加在一起，才是我们说的家。',
      questionAudio: 'assets/interview/q8.wav', questionDuration: 5.4,
      answerAudio: 'assets/interview/a8.wav', answerDuration: 20.2
    }
  ];

  // 记忆长廊：14 个年代节点（1960—2012），图片/原声均来自素材包「回忆长廊」，文案来自同名 txt
  const memories = [
    { id: 'pier-1960', title: '夏天的仓山码头', year: '1960 年', place: '仓山', type: 'photo', image: 'assets/memories/1960-summer-wharf.webp', audio: 'assets/memories/1960-cangshan-pier.wav', duration: 21, story: '小时候一到暑假就往码头跑，看船进港，捡掉在地上的荔枝壳玩。哪一年记不清了，只记得那时候江水很清。' },
    { id: 'fishball-1965', title: '奶奶做的鱼丸', year: '1965 年', place: '福州', type: 'photo', image: 'assets/memories/1965-fish-balls.webp', audio: 'assets/memories/1965-grandma-yuwan.wav', duration: 18, story: '奶奶做鱼丸要先把鱼肉刮下来，用刀背捶一个钟头。过年才吃得上，一人分五个，小孩总想多要一个。' },
    { id: 'radio-1968', title: '第一台收音机', year: '1968 年', place: '福州', type: 'photo', image: 'assets/memories/1968-radio.webp', audio: 'assets/memories/1968-first-radio.wav', duration: 18, story: '家里第一台收音机是二手的，天线要用铁丝接长。每天晚上全家围着听评话，声音小得要凑着耳朵。' },
    { id: 'buddy-1970', title: '码头上的老伙计', year: '1970 年', place: '码头', type: 'photo', image: 'assets/memories/1970-old-partner.webp', audio: 'assets/memories/1970-pier-buddy.wav', duration: 16, story: '货运队里最要好的是老陈，两个人搭档扛了八年货。后来他去了厦门，每年过年还会寄一张贺卡来。' },
    { id: 'first-job-1975', title: '年轻时的第一份工作', year: '1975 年', place: '福州', type: 'photo', image: 'assets/memories/1975-first-job.webp', audio: 'assets/memories/1975-first-job.wav', duration: 35, story: '年轻那会儿进了厂，第一次站到车床前，师傅只叮嘱我手要稳、眼要准。头一个月的工资大半交给了家里，剩下的钱买了件新衬衫——那时候觉得，能靠自己挣钱，人就算真正长大了。' },
    { id: 'wenrufang', title: '门洞后面，就是家', year: '1978 年', place: '文儒坊', type: 'photo', image: 'assets/story/wenrufang-1978.webp', audio: 'assets/memories/1978-wenrufang.wav', duration: 15, story: '女儿临去外地读书前，在一家人每天经过的门口，为父亲留下了一张照片。木门声、自行车铃和石板路上的推车声，后来都成了他对“家”的记忆。' },
    { id: 'teahouse-1978', title: '台江的老茶馆', year: '1978 年', place: '台江', type: 'photo', image: 'assets/memories/1978-teahouse.webp', audio: 'assets/memories/1978-taijiang-teahouse.wav', duration: 23, story: '下班以后常去码头边的茶馆，一壶茶两毛钱，能坐一晚上听人讲古。后来茶馆拆了，那条街也不在了。' },
    { id: 'wedding-1979', title: '结婚那年的合影', year: '1979 年', place: '福州', type: 'voice', audio: 'assets/memories/1979-wedding.wav', duration: 19, story: '结婚那天没有婚纱，借了同事的中山装去照相馆。照片里两个人都不敢笑，其实心里高兴得很。' },
    { id: 'chuanzheng-1982', title: '船政的码头', year: '1982 年', place: '马尾', type: 'photo', image: 'assets/memories/1982-shipyard.webp', story: '高高的吊机、船上的彩旗，还有船台周围密密的人群。大家仰头望着准备下水的船，那是许多工人共同完成的一件大事。' },
    { id: 'xiaolin-1983', title: '小陈出生的冬天', year: '1983 年', place: '福州', type: 'voice', audio: 'assets/memories/1983-xiaolin-birth.wav', duration: 18, story: '那年冬天特别冷，去医院的路上骑车摔了一跤。抱到孩子的时候，什么都忘了。' },
    { id: 'move-in-1986', title: '搬进老房子的那天', year: '1986 年', place: '福州', type: 'photo', image: 'assets/memories/1986-old-house.webp', audio: 'assets/memories/1986-move-in.wav', duration: 20, story: '搬家那天，一家人先把旧木桌搬进客厅。那张桌子后来吃了三十年的饭，桌角还有小陈小时候刻的字。' },
    { id: 'typhoon-1990', title: '台风夜守屋', year: '1990 年', place: '福州', type: 'voice', audio: 'assets/memories/1990-typhoon-night.wav', duration: 18, story: '那年台风大，瓦片被掀掉了一半。一家人拿盆接水接了一整夜，天亮以后邻居们互相帮着上房修瓦。' },
    { id: 'teahouse-1994', title: '台江老茶馆', year: '1994 年', place: '台江', type: 'photo', image: 'assets/memories/1994-teahouse.webp', story: '门前自行车一辆接一辆，行人从商店和街口之间来来往往。街道不算宽，却装得下许多人热热闹闹的日常。' },
    { id: 'retirement-tea-2012', title: '退休那天的茶', year: '2012 年', place: '福州', type: 'voice', audio: 'assets/memories/2012-retirement-tea.wav', duration: 17, story: '那天同事们送了一罐茉莉花茶。回家泡了一壶，坐在门口喝到天黑，觉得这辈子也没白忙。' }
  ];

  // 家人编辑的问题（单源数据）：默认取第 1 问，编辑后贯通到邀请预览、长辈页与家人首页
  const askState = { question: interview[0].question };

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '00:00';
    const value = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  }

  function toast(message) {
    clearTimeout(toastTimer);
    toastElement.textContent = message;
    toastElement.classList.add('is-on');
    toastTimer = setTimeout(() => toastElement.classList.remove('is-on'), 2200);
  }

  function interviewShareUrl() {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('invite', 'chen-wenrufang');
    return url.href;
  }

  function updateInterviewShareLink() {
    const input = $('#interviewShareUrl');
    if (!input) return;
    input.value = interviewShareUrl();
    const localOnly = ['127.0.0.1', 'localhost'].includes(location.hostname);
    $('#shareLinkHint').textContent = localOnly
      ? '当前为本地演示地址，只能在本机打开；部署到公网域名后，可将同一路由直接发到微信。'
      : '链接已可复制到微信。陈老先生打开后会直接进入采访邀请页。';
  }

  async function copyInterviewShareLink() {
    const value = interviewShareUrl();
    try {
      await navigator.clipboard.writeText(value);
      toast('采访链接已复制');
    } catch {
      const input = $('#interviewShareUrl');
      input.focus();
      input.select();
      document.execCommand('copy');
      toast('采访链接已复制');
    }
  }

  async function shareInterviewLink() {
    const data = { title: '小陈邀请您聊聊往事', text: '爸，想请您看看文儒坊这张旧照片，聊聊当年的故事。', url: interviewShareUrl() };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    await copyInterviewShareLink();
    toast('链接已复制，可粘贴到微信发送');
  }

  function setShell(screen) {
    const requested = screen.dataset.shell || 'family';
    if (requested === 'family' || requested === 'elder') roleContext = requested;
    const shell = requested === 'shared' ? roleContext : requested;
    document.body.dataset.shell = shell;
  }

  function updateNavigation(id) {
    const navMap = { 's-family': 's-family', 's-project': 's-family', 's-home': 's-home', 's-create': 's-create', 's-invite-sent': 's-create', 's-bookshelf': 's-bookshelf', 's-book-customize': 's-bookshelf', 's-me': 's-me' };
    let active = navMap[id];
    if (id === 's-book-customize' && sourceOf['s-book-customize'] === 's-me') active = 's-me';
    $$('[data-nav]').forEach(button => button.classList.toggle('is-on', button.dataset.nav === active));
  }

  function activateEngines(previousId, nextId) {
    if (previousId === 's-home') window.__manor?.deactivate();
    if (previousId === 's-gallery') galleryHall.deactivate();
    if (previousId === 's-book-customize') bookModel?.deactivate();
    requestAnimationFrame(() => {
      if (nextId === 's-home') {
        if (window.__manor) window.__manor.activate();
        else window.__manorPending = true;
      }
      if (nextId === 's-gallery') galleryHall.activate();
      if (nextId === 's-book-customize') bookModel?.activate();
    });
  }

  function go(id, options = {}) {
    const next = screens.get(id);
    if (!next || id === currentScreen) return;
    const previousId = currentScreen;
    if (previousId === 's-interview' && id === 's-confirm') audio.pause();
    const previous = screens.get(previousId);
    previous?.classList.remove('is-active');
    next.classList.add('is-active');
    next.scrollTop = 0;
    sourceOf[id] = previousId;
    currentScreen = id;
    document.body.dataset.screen = id;
    if (options.replace) historyStack[historyStack.length - 1] = id;
    else if (!options.back) historyStack.push(id);
    setShell(next);
    updateNavigation(id);
    updateBackTargets(id);
    activateEngines(previousId, id);
    if (id === 's-interview') renderInterview();
    if (id === 's-invite-sent') updateInterviewShareLink();
    if (id === 's-book') renderBookPage(false);
    if (id === 's-confirm' || id === 's-confirmed') updateConfirmState();
    if (id === 's-invite-sent' || id === 's-elder-invite') syncQuestionUI();
  }

  function back() {
    go(sourceOf[currentScreen] && sourceOf[currentScreen] !== currentScreen ? sourceOf[currentScreen] : 's-family');
  }

  const clipAudio = new Audio();
  clipAudio.preload = 'metadata';
  let detailEntry = null;

  function findEntry(id) {
    return memories.find(item => item.id === id);
  }

  function openDetail(id) {
    const entry = findEntry(id) || memories[0];
    detailEntry = entry;
    if (!audio.paused) audio.pause();
    $('#detailMeta').textContent = `${entry.year} · ${entry.place}`;
    $('#detailTitle').textContent = entry.title;
    $('#detailStory').textContent = entry.story;
    const detailImage = $('#detailImage');
    let voiceCard = $('#detailVoiceCard');
    if (!voiceCard) {
      voiceCard = document.createElement('div');
      voiceCard.id = 'detailVoiceCard';
      detailImage.insertAdjacentElement('afterend', voiceCard);
    }
    if (entry.image) {
      detailImage.hidden = false;
      voiceCard.hidden = true;
      detailImage.src = entry.image;
      detailImage.alt = `${entry.title}照片`;
    } else {
      // voice 型记忆没有照片：展示「声音卡」（大年份 + 波形），不再借用文儒坊照片
      detailImage.hidden = true;
      voiceCard.hidden = false;
      voiceCard.innerHTML = `<div class="detail-voice-year"><b>${entry.year.replace(/[^0-9]/g, '')}</b><small>原声记忆 · 无照片</small></div><div class="detail-voice-wave">${waveBars(42, Number(entry.year.replace(/[^0-9]/g, '')) % 9)}</div>`;
    }
    const detailAudioButton = $('#detailAudio');
    detailAudioButton.hidden = !entry.audio;
    if (entry.audio) $('#detailAudioLabel').textContent = `讲述者旁白 · ${formatTime(entry.duration)}`;
    clipAudio.pause();
    clipAudio.removeAttribute('src');
    $('#detailAudioTime').textContent = '00:00';
    const sheet = $('#detailSheet');
    sheet.hidden = false;
    requestAnimationFrame(() => $('[data-close-detail]', sheet)?.focus());
  }

  function closeDetail() {
    $('#detailSheet').hidden = true;
    clipAudio.pause();
  }

  $('#detailAudio').addEventListener('click', () => {
    if (!detailEntry?.audio) return;
    if (clipAudio.paused || clipAudio.ended) {
      if (clipAudio.ended || !clipAudio.src || !clipAudio.src.endsWith(detailEntry.audio)) clipAudio.src = detailEntry.audio;
      if (!audio.paused) audio.pause();
      clipAudio.play().catch(() => toast('请再次点击播放原声'));
    } else {
      clipAudio.pause();
    }
  });
  clipAudio.addEventListener('timeupdate', () => {
    $('#detailAudioTime').textContent = formatTime(clipAudio.currentTime);
  });
  clipAudio.addEventListener('play', () => $('#detailAudio').classList.add('is-playing'));
  clipAudio.addEventListener('pause', () => $('#detailAudio').classList.remove('is-playing'));

  function renderCreateStep() {
    $$('.create-step').forEach((step, index) => step.classList.toggle('is-on', index === createStep));
    $$('.step-rail i').forEach((item, index) => item.classList.toggle('is-on', index <= createStep));
    $('#createStepCount').textContent = `${createStep + 1} / 3`;
    $('#createPrev').hidden = createStep === 0;
    const labels = ['选好了，写问题', '看看爸爸将收到什么', '生成采访邀请'];
    $('#createNext').textContent = labels[createStep];
    if (createStep === 2) syncQuestionUI();
  }

  function buildWaveform() {
    const waveform = $('#conversationWaveform');
    if (!waveform) return;
    if (waveform.childElementCount) return;
    for (let index = 0; index < 76; index += 1) {
      const bar = document.createElement('i');
      const height = 7 + Math.abs(Math.sin(index * 1.71) * 23) + (index % 5);
      bar.style.height = `${height}px`;
      bar.style.animationDelay = `${-(index % 13) * 0.07}s`;
      waveform.appendChild(bar);
    }
  }

  function renderInterview(index = interviewIndex) {
    interviewIndex = clamp(index, 0, interview.length - 1);
    revealedInterviewCount = Math.max(revealedInterviewCount, interviewIndex + 1);
    const thread = $('#chatThread');
    if (!thread) return;
    thread.innerHTML = interview.slice(0, revealedInterviewCount).map((item, index) => `
      <div class="chat-turn${index === interviewIndex ? ' is-current' : ''}">
        <article class="chat-message chat-message--ai">
          <div class="chat-avatar chat-avatar--ai"><svg class="icon" aria-hidden="true"><use href="#i-spark"/></svg></div>
          <div class="chat-bubble"><header><b>AI 采访者 · 鲁小豫</b><span>${String(index + 1).padStart(2, '0')} / ${String(interview.length).padStart(2, '0')}</span></header><p>${item.question}</p></div>
        </article>
        <article class="chat-message chat-message--human">
          <div class="chat-bubble chat-voice-card"><header><span><img src="assets/people/dad.jpg" alt=""><b>陈老先生</b></span><small>原声回答</small></header><p>${item.answer}</p><button type="button" class="chat-inline-audio" data-audio-round="${index}" aria-label="播放第 ${index + 1} 段回答"><span class="chat-mini-wave">${waveBars(28, index + 2)}</span><em>${Math.round(item.answerDuration)}s</em><svg class="icon"><use href="#i-play"/></svg></button></div>
        </article>
      </div>`).join('');
    $('#chatRound').textContent = `第 ${interviewIndex + 1} / ${interview.length} 轮`;
    $('#chatProgressBar').style.width = `${((interviewIndex + 1) / interview.length) * 100}%`;
    const nextButton = $('#nextQuestion');
    nextButton.disabled = interviewIndex === interview.length - 1;
    $('#nextQuestion span').textContent = interviewIndex === interview.length - 1 ? '追问已完成' : '继续追问';
    requestAnimationFrame(() => thread.scrollTo({ top: thread.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' }));
  }

  // 原声播放队列：full = 采访全程序（问→答交替，共 02:47），answers = 陈老先生 8 段回答（共 02:10）
  const playlists = {
    full: interview.flatMap((item, round) => [
      { kind: 'question', round, src: item.questionAudio, duration: item.questionDuration },
      { kind: 'answer', round, src: item.answerAudio, duration: item.answerDuration }
    ]),
    answers: interview.map((item, round) => ({ kind: 'answer', round, src: item.answerAudio, duration: item.answerDuration }))
  };
  const queue = { mode: 'answers', index: 0 };

  function queueElapsed() {
    const clips = playlists[queue.mode];
    let total = 0;
    for (let index = 0; index < queue.index && index < clips.length; index += 1) total += clips[index].duration;
    const clip = clips[queue.index];
    if (clip && !audio.paused && !audio.ended) total += Math.min(audio.currentTime || 0, clip.duration);
    return total;
  }

  function syncPlaybackToUI() {
    const clip = playlists[queue.mode][queue.index];
    if (!clip) return;
    if (currentScreen === 's-interview') renderInterview(clip.round);
    if ($('#roomSubtitle') && clip.kind === 'answer') $('#roomSubtitle').textContent = `“${interview[clip.round].answer}”`;
  }

  async function playQueueClip() {
    const clip = playlists[queue.mode][queue.index];
    if (!clip) return;
    if (!clipAudio.paused) clipAudio.pause();
    if (!audio.src || !audio.src.endsWith(clip.src)) audio.src = clip.src;
    try {
      await audio.play();
      if (clip.kind === 'answer') recordedRounds = Math.max(recordedRounds, clip.round + 1);
      syncPlaybackToUI();
    } catch (error) {
      console.error(error);
      toast('iPhone 需要先点击播放按钮才能播放原声');
    }
  }

  async function toggleAudio({ restart = false } = {}) {
    try {
      const target = currentScreen === 's-interview' ? 'full' : 'answers';
      if (!audio.paused && !audio.ended && queue.mode === target && !restart) {
        audio.pause();
        return;
      }
      if (queue.mode !== target || restart || audio.ended) {
        queue.mode = target;
        queue.index = 0;
      }
      await playQueueClip();
    } catch (error) {
      console.error(error);
      toast('iPhone 需要先点击播放按钮才能播放原声');
    }
  }

  function updateAudioUI() {
    const playing = !audio.paused && !audio.ended;
    document.body.classList.toggle('is-audio-playing', playing);
    $('#conversationWaveform')?.classList.toggle('is-playing', playing);
    const elapsed = queueElapsed();
    $('#audioTime').textContent = formatTime(elapsed);
    $('#proofAudioTime').textContent = formatTime(elapsed);
    $$('[data-audio-toggle]').forEach(button => button.setAttribute('aria-label', playing ? '暂停原声' : '播放原声'));
    if (playing) syncPlaybackToUI();
  }

  function confirmMemory() {
    audio.pause();
    go('s-confirmed');
  }

  function playDoorTransition() {
    const transition = $('#doorTransition');
    transition.classList.remove('is-on');
    void transition.offsetWidth;
    transition.classList.add('is-on');
    setTimeout(() => transition.classList.remove('is-on'), reducedMotion ? 20 : 1500);
  }

  function unlockAudio() {
    playDoorTransition();
    queue.mode = 'answers';
    queue.index = 0;
    playQueueClip().catch(() => toast('进入房间后，点击磁带即可播放原声'));
  }

  function renderBookPage(animate = true, previous = bookPage) {
    const leaves = $$('.book-leaf');
    const nextLeaf = leaves[bookPage];
    const previousLeaf = leaves[previous];
    if (animate && previousLeaf && previousLeaf !== nextLeaf && !reducedMotion) {
      bookTurning = true;
      previousLeaf.classList.remove('is-active');
      previousLeaf.classList.add('is-turn-out');
      nextLeaf.classList.add('is-turn-in');
      setTimeout(() => {
        previousLeaf.classList.remove('is-turn-out');
        nextLeaf.classList.remove('is-turn-in');
        nextLeaf.classList.add('is-active');
        bookTurning = false;
      }, 640);
    } else {
      leaves.forEach((leaf, index) => leaf.classList.toggle('is-active', index === bookPage));
      bookTurning = false;
    }
    const pageLabels = ['封面', '第一部分', '人物小传', '文儒坊', '生活的声音', '邻里', '影像档案', '制作实体书'];
    $('#bookPageOutput').textContent = `${pageLabels[bookPage]} · ${bookPage + 1}/${leaves.length}`;
    $('#bookProgress').style.width = `${((bookPage + 1) / leaves.length) * 100}%`;
    $('#bookPrev').disabled = bookPage === 0;
    $('#bookNext').disabled = bookPage === leaves.length - 1;
    $('#bookNext span').textContent = bookPage === 0 ? '翻开' : '下一页';
  }

  function turnBook(delta) {
    if (bookTurning) return;
    const next = clamp(bookPage + delta, 0, $$('.book-leaf').length - 1);
    if (next === bookPage) return;
    const previous = bookPage;
    bookPage = next;
    renderBookPage(true, previous);
  }

  function waveBars(count, seed = 1) {
    return Array.from({ length: count }, (_, index) => `<i style="height:${5 + Math.abs(Math.sin((index + seed) * 1.37) * 16)}px"></i>`).join('');
  }

  class MemoryHall {
    constructor(section) {
      this.section = section;
      this.world = $('.hall__world', section);
      this.hud = $('.hud', section);
      this.arrival = $('.hud__arrival', section);
      this.spacer = $('.hall__spacer', section);
      this.length = 5500;
      this.maxScroll = this.length - 330;
      this.camera = { x: 0, z: 260, yaw: 0 };
      this.target = { x: 0, z: 0, yaw: 0 };
      this.items = [];
      this.tiles = [];
      this.active = false;
      this.frame = 0;
      this.spacer.style.height = `${this.maxScroll}px`;
      this.build();
      this.section.addEventListener('scroll', () => this.onScroll(), { passive: true });
    }

    add(className, z, style) {
      const element = document.createElement('div');
      element.className = className;
      element.style.cssText = style;
      element.dataset.z = String(z);
      this.world.appendChild(element);
      return element;
    }

    build() {
      for (let near = 600; near > -this.length; near -= 600) {
        const far = near - 600;
        const center = (near + far) / 2;
        const tiles = [
          this.add('t t--floor', center, `transform:translateZ(${near}px) rotateX(90deg) translateY(-600px)`),
          this.add('t t--ceil', center, `transform:translateZ(${near}px) rotateX(-90deg)`),
          this.add('t t--wall', center, `left:-200px;transform:translateZ(${near}px) rotateY(90deg)`),
          this.add('t t--wall', center, `left:200px;transform:translateZ(${near}px) rotateY(90deg)`)
        ];
        tiles.forEach(tile => { tile.dataset.far = String(far); this.tiles.push(tile); });
      }
      for (let z = -150; z > -this.length + 120; z -= 300) {
        this.items.push(this.add('col', z, `left:-200px;transform:translateZ(${z}px)`));
        this.items.push(this.add('col', z, `left:184px;transform:translateZ(${z}px)`));
        this.items.push(this.add('cone', z + 60, `transform:translateZ(${z + 60}px)`));
      }
      memories.forEach((memory, index) => {
        const x = index % 2 ? 118 : -118;
        const z = -520 - index * 325;
        const angle = index % 2 ? -21 : 21;
        const lightbox = this.add(`lb lb--${memory.type}`, z, `left:${x - 84}px;top:-22px;transform:translateZ(${z}px) rotateY(${angle}deg)`);
        const face = memory.type === 'photo'
          ? `<div class="lb__face"><img src="${memory.image}" alt="${memory.title}" loading="lazy" decoding="async"></div>`
          : `<div class="lb__face"><b>${memory.title}</b><div class="w">${waveBars(22, index)}</div><small>● 原声片段 · 本人确认</small></div>`;
        lightbox.innerHTML = `${face}<div class="lb__base"></div><div class="lb__cap"><b>${memory.title}</b>${memory.year}</div>`;
        lightbox.dataset.memory = memory.id;
        lightbox.dataset.x = String(x);
        lightbox.addEventListener('click', event => {
          event.stopPropagation();
          this.focus(lightbox);
        });
        this.items.push(lightbox);
        this.items.push(this.add('pool', z + 60, `transform:translate3d(${x}px,0,${z + 60}px) rotateX(90deg) translateY(-160px)`));
      });
      const endWall = this.add('endwall', -this.length, `transform:translateZ(${-this.length}px)`);
      endWall.innerHTML = `<div class="end-title"><b>人生之书</b><small>CHEN FAMILY · 14 MEMORIES</small></div><div class="end-shelf"><button class="end-book" data-go="s-book">陈老先生<br>的人生故事<small>取下翻阅</small></button></div>`;
      this.items.push(endWall);
      for (let index = 0; index < 18; index += 1) {
        const x = Math.round(Math.sin(index * 7.3) * 170);
        const y = Math.round(Math.cos(index * 3.1) * 90);
        const z = -Math.round(((index * 0.61) % 1) * this.length);
        this.items.push(this.add('dust', z, `left:${x}px;top:${y}px;transform:translateZ(${z}px);animation-delay:${-(index * 0.9)}s`));
      }
    }

    onScroll() {
      this.target.z = -this.section.scrollTop;
      this.hud.classList.toggle('is-moved', this.section.scrollTop > 40);
      this.arrival.classList.toggle('is-on', this.section.scrollTop > this.maxScroll - 150);
    }

    activate() {
      this.active = true;
      this.section.scrollTop = 0;
      this.camera = { x: 0, z: reducedMotion ? 0 : 260, yaw: 0 };
      this.target = { x: 0, z: 0, yaw: 0 };
      this.hud.classList.remove('is-moved');
      this.arrival.classList.remove('is-on');
      cancelAnimationFrame(this.frame);
      this.loop();
    }

    deactivate() {
      this.active = false;
      cancelAnimationFrame(this.frame);
    }

    loop() {
      const draw = () => {
        if (!this.active) return;
        this.camera.z += (this.target.z - this.camera.z) * 0.16;
        this.camera.x += (this.target.x - this.camera.x) * 0.1;
        this.camera.yaw += (this.target.yaw - this.camera.yaw) * 0.1;
        this.world.style.transform = `rotateY(${this.camera.yaw.toFixed(2)}deg) translate3d(${(-this.camera.x).toFixed(1)}px,0,${(-this.camera.z).toFixed(1)}px)`;
        this.applyDepth();
        this.frame = requestAnimationFrame(draw);
      };
      this.frame = requestAnimationFrame(draw);
    }

    applyDepth() {
      const cameraZ = this.camera.z;
      this.items.forEach(element => {
        const ahead = cameraZ - Number(element.dataset.z);
        element.style.visibility = ahead < -90 ? 'hidden' : '';
        const brightness = clamp(1 - (ahead - 500) / 1750, 0.06, 1);
        element.style.filter = brightness < 0.995 ? `brightness(${brightness.toFixed(2)})` : '';
        if (element.classList.contains('lb')) element.classList.toggle('is-near', ahead > 90 && ahead < 620);
      });
      this.tiles.forEach(tile => {
        const far = Number(tile.dataset.far);
        tile.style.visibility = far > cameraZ + 430 ? 'hidden' : '';
      });
    }

    focus(lightbox) {
      const memoryId = lightbox.dataset.memory;
      const z = Number(lightbox.dataset.z);
      const x = Number(lightbox.dataset.x);
      const goal = clamp(-(z + 250), 0, this.maxScroll);
      const start = this.section.scrollTop;
      const distance = goal - start;
      this.target.x = x * 0.5;
      this.target.yaw = x > 0 ? 6 : -6;
      const started = performance.now();
      const duration = reducedMotion ? 1 : Math.min(900, 430 + Math.abs(distance) * 0.4);
      const step = now => {
        const progress = clamp((now - started) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        this.section.scrollTop = start + distance * eased;
        this.target.z = -this.section.scrollTop;
        if (progress < 1) return requestAnimationFrame(step);
        setTimeout(() => {
          openDetail(memoryId);
          this.target.x = 0;
          this.target.yaw = 0;
        }, reducedMotion ? 0 : 100);
      };
      requestAnimationFrame(step);
    }
  }

  class PhysicalBookModel {
    constructor(canvas) {
      this.canvas = canvas;
      this.active = false;
      this.dragging = false;
      this.targetX = -0.18;
      this.targetY = -0.34;
      this.distance = 1.18;
      this.view = 'set';
      this.coverStyle = 'blueprint';
      this.packageStyle = 'indigo';
      if (!window.THREE || !canvas) return;
      const T = window.THREE;
      this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
      this.renderer.outputEncoding = T.sRGBEncoding;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.78;
      this.renderer.shadowMap.enabled = true;
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(36, 1, 0.1, 100);
      this.root = new T.Group();
      this.scene.add(this.root);
      this.scene.add(new T.HemisphereLight(0xf6ead4, 0x102036, 1.15));
      const key = new T.DirectionalLight(0xffe2b8, 1.42);
      key.position.set(6, 10, 8);
      key.castShadow = true;
      this.scene.add(key);
      const rim = new T.DirectionalLight(0x80a9d1, 0.72);
      rim.position.set(-8, 4, -7);
      this.scene.add(rim);
      this.coverCanvas = document.createElement('canvas');
      this.coverCanvas.width = 1024;
      this.coverCanvas.height = 1280;
      this.coverTexture = new T.CanvasTexture(this.coverCanvas);
      this.coverTexture.encoding = T.sRGBEncoding;
      this.coverTexture.center.set(0.5, 0.5);
      this.coverTexture.rotation = Math.PI / 2;
      this.packageCanvas = document.createElement('canvas');
      this.packageCanvas.width = 768;
      this.packageCanvas.height = 768;
      this.packageTexture = new T.CanvasTexture(this.packageCanvas);
      this.packageTexture.encoding = T.sRGBEncoding;
      this.packageTexture.wrapS = this.packageTexture.wrapT = T.RepeatWrapping;
      this.packageTexture.repeat.set(0.78, 1.0);
      this.coverImage = new Image();
      this.coverImage.src = 'assets/story/wenrufang-1978.webp';
      this.coverImage.addEventListener('load', () => { this.drawCover(); this.build(); });
      this.drawCover();
      this.drawPackage();
      this.build();
      this.bind();
      const ground = new T.Mesh(new T.PlaneGeometry(38, 38), new T.ShadowMaterial({ color: 0x000000, opacity: 0.28 }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.78;
      ground.receiveShadow = true;
      this.scene.add(ground);
    }

    material(color, map = null, roughness = 0.78) {
      return new THREE.MeshStandardMaterial({ color, map, roughness, metalness: 0.02 });
    }

    box(parent, size, position, materials, rotation = [0, 0, 0]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), materials);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    drawCover() {
      const context = this.coverCanvas.getContext('2d');
      const width = this.coverCanvas.width;
      const height = this.coverCanvas.height;
      context.clearRect(0, 0, width, height);
      if (this.coverStyle === 'blueprint') {
        context.fillStyle = '#f3efe6';
        context.fillRect(0, 0, width, height);
        context.strokeStyle = 'rgba(31,65,108,.07)';
        for (let x = 0; x < width; x += 8) {
          context.beginPath();
          context.moveTo(x, 0);
          context.lineTo(x, height);
          context.stroke();
        }
        const indigo = '#173f70';
        context.fillStyle = indigo;
        context.strokeStyle = indigo;
        context.textAlign = 'left';
        context.font = '600 28px serif';
        context.fillText('时光回响 · 人物故事册', 78, 92);
        context.font = '700 76px serif';
        context.fillText('陈老先生', 500, 250);
        context.fillText('的人生故事', 500, 342);
        context.font = '500 24px sans-serif';
        context.fillText('口述记忆 · 文儒坊 · 福州', 504, 392);
        const drawFigure = (x, y, flip = 1) => {
          context.save();
          context.translate(x, y);
          context.scale(flip, 1);
          context.lineWidth = 9;
          context.beginPath();
          context.arc(0, -120, 42, 0, Math.PI * 2);
          context.stroke();
          context.beginPath();
          context.moveTo(-58, -72);
          context.quadraticCurveTo(-85, 50, -42, 168);
          context.lineTo(42, 168);
          context.quadraticCurveTo(82, 48, 58, -72);
          context.closePath();
          context.stroke();
          for (let petal = 0; petal < 11; petal += 1) {
            const angle = (petal / 11) * Math.PI * 2;
            context.beginPath();
            context.ellipse(Math.cos(angle) * 48, Math.sin(angle) * 78 + 30, 9, 22, angle, 0, Math.PI * 2);
            context.fill();
          }
          context.restore();
        };
        drawFigure(260, 820, 1);
        drawFigure(640, 835, -1);
        for (let index = 0; index < 7; index += 1) {
          const x = 90 + index * 130;
          context.beginPath();
          for (let petal = 0; petal < 8; petal += 1) {
            const angle = (petal / 8) * Math.PI * 2;
            context.ellipse(x + Math.cos(angle) * 26, 1135 + Math.sin(angle) * 26, 7, 18, angle, 0, Math.PI * 2);
          }
          context.fill();
        }
        context.font = '500 24px sans-serif';
        context.fillText('根据本人亲口讲述并确认的记忆整理', 78, height - 64);
      } else if (this.coverStyle === 'archive' && this.coverImage.complete && this.coverImage.naturalWidth) {
        const scale = Math.max(width / this.coverImage.naturalWidth, height / this.coverImage.naturalHeight);
        const drawWidth = this.coverImage.naturalWidth * scale;
        const drawHeight = this.coverImage.naturalHeight * scale;
        context.drawImage(this.coverImage, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
        context.fillStyle = 'rgba(45,16,12,.47)';
        context.fillRect(0, 0, width, height);
      } else {
        context.fillStyle = this.coverStyle === 'red' ? '#773227' : '#d8cdb9';
        context.fillRect(0, 0, width, height);
        if (this.coverStyle === 'linen') {
          context.strokeStyle = 'rgba(78,58,39,.08)';
          for (let x = 0; x < width; x += 7) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
        }
      }
      if (this.coverStyle !== 'blueprint') {
        context.fillStyle = this.coverStyle === 'linen' ? '#2a2119' : '#f4e3c7';
        context.textAlign = 'left';
        context.font = '600 28px serif';
        context.fillText('时光回响 · 人物故事册', 82, 104);
        context.font = '700 82px serif';
        context.fillText('陈老先生', 82, 530);
        context.fillText('的人生故事', 82, 635);
        context.font = '500 27px sans-serif';
        context.fillText('根据本人亲口讲述并确认的记忆整理', 82, height - 96);
      }
      this.coverTexture.needsUpdate = true;
    }

    drawPackage() {
      const context = this.packageCanvas.getContext('2d');
      const size = this.packageCanvas.width;
      context.clearRect(0, 0, size, size);
      context.fillStyle = '#123b5c';
      context.fillRect(0, 0, size, size);
      context.strokeStyle = 'rgba(232,236,218,.78)';
      context.fillStyle = 'rgba(232,236,218,.88)';
      for (let y = 44; y < size; y += 96) {
        for (let x = 44; x < size; x += 96) {
          context.save();
          context.translate(x + ((y / 96) % 2) * 34, y);
          for (let petal = 0; petal < 8; petal += 1) {
            context.rotate(Math.PI / 4);
            context.beginPath();
            context.ellipse(0, 15, 5, 14, 0, 0, Math.PI * 2);
            context.fill();
          }
          context.beginPath();
          context.arc(0, 0, 7, 0, Math.PI * 2);
          context.fillStyle = '#123b5c';
          context.fill();
          context.stroke();
          context.restore();
          context.fillStyle = 'rgba(232,236,218,.88)';
        }
      }
      this.packageTexture.needsUpdate = true;
    }

    build() {
      if (!this.root) return;
      while (this.root.children.length) this.root.remove(this.root.children[0]);
      const page = this.material(0xe9ddc8);
      const edge = this.material(0xbca98c);
      const coverColor = this.coverStyle === 'blueprint' ? 0xe7dfd0 : this.coverStyle === 'red' ? 0x6e2d23 : this.coverStyle === 'linen' ? 0xcbbda5 : 0x6f392d;
      const coverBase = this.material(coverColor);
      const coverTop = this.material(0xffffff, this.coverTexture);
      const spineMaterial = this.material(this.coverStyle === 'blueprint' ? 0x173f70 : coverColor, null, 0.9);
      const threadMaterial = this.material(0xeee6d5, null, 0.72);
      this.book = new THREE.Group();
      this.box(this.book, [5.2, 0.62, 7.2], [0, 0.05, 0], [edge, page, page, page, page, page]);
      this.box(this.book, [5.55, 0.15, 7.55], [0, -0.34, 0], coverBase);
      this.box(this.book, [5.55, 0.15, 7.55], [0, 0.44, 0], [coverBase, coverBase, coverTop, coverBase, coverBase, coverBase]);
      this.box(this.book, [0.23, 0.92, 7.58], [-2.73, 0.05, 0], spineMaterial);
      if (this.coverStyle === 'blueprint') {
        for (let index = 0; index < 7; index += 1) {
          this.box(this.book, [0.13, 0.14, 0.5], [-2.87, 0.05, -3 + index], threadMaterial, [0, 0, 0.15]);
        }
      }
      this.book.rotation.z = -0.035;
      this.root.add(this.book);
      this.package = new THREE.Group();
      const packageColor = this.packageStyle === 'drawer' ? 0x4b2e1c : this.packageStyle === 'cloth' ? 0xb8aa92 : 0xffffff;
      const packageMaterial = this.material(packageColor, this.packageStyle === 'indigo' ? this.packageTexture : null, 0.92);
      this.box(this.package, [6.2, 0.17, 8.15], [0, -0.58, 0], packageMaterial);
      this.box(this.package, [6.2, 0.17, 8.15], [0, 0.58, 0], packageMaterial);
      this.box(this.package, [0.2, 1.16, 8.15], [-3.1, 0, 0], packageMaterial);
      this.box(this.package, [6.2, 1.16, 0.2], [0, 0, -4.08], packageMaterial);
      this.root.add(this.package);
      this.setView(this.view);
    }

    setView(view) {
      if (!this.book || !this.package) return;
      this.view = view;
      this.book.visible = view !== 'package';
      this.package.visible = view !== 'book';
      if (view === 'set') {
        // 函套开口朝右前方，书脊朝开口、半插入函套（呈抽出状态），不再并排摆放
        this.package.position.set(0.55, -0.05, -0.35);
        this.package.rotation.y = 0.16;
        this.book.position.set(3.15, -0.02, -0.15);
        this.book.rotation.y = Math.PI + 0.16;
        this.distance = 1.3;
      } else {
        this.book.position.set(0, 0, 0);
        this.book.rotation.y = 0;
        this.package.position.set(0, 0, 0);
        this.package.rotation.y = 0;
        this.distance = view === 'package' ? 1.2 : 1;
      }
    }

    bind() {
      let lastX = 0;
      let lastY = 0;
      this.canvas.addEventListener('pointerdown', event => {
        this.dragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
        this.canvas.setPointerCapture?.(event.pointerId);
      });
      this.canvas.addEventListener('pointermove', event => {
        if (!this.dragging) return;
        this.targetY += (event.clientX - lastX) * 0.009;
        this.targetX = clamp(this.targetX + (event.clientY - lastY) * 0.007, -1.05, 0.55);
        lastX = event.clientX;
        lastY = event.clientY;
      });
      const release = () => { this.dragging = false; };
      this.canvas.addEventListener('pointerup', release);
      this.canvas.addEventListener('pointercancel', release);
    }

    resize() {
      if (!this.renderer) return;
      const bounds = this.canvas.getBoundingClientRect();
      if (bounds.width < 2 || bounds.height < 2) return;
      this.renderer.setSize(bounds.width, bounds.height, false);
      this.camera.aspect = bounds.width / bounds.height;
      this.camera.updateProjectionMatrix();
    }

    activate() {
      if (!this.renderer) return;
      this.active = true;
      this.resize();
      cancelAnimationFrame(this.frame);
      this.animate();
    }

    deactivate() {
      this.active = false;
      cancelAnimationFrame(this.frame);
    }

    animate() {
      if (!this.active) return;
      this.root.rotation.x += (this.targetX - this.root.rotation.x) * 0.09;
      this.root.rotation.y += (this.targetY - this.root.rotation.y) * 0.09;
      this.camera.position.set(10 * this.distance, 8.6 * this.distance, 12.5 * this.distance);
      this.camera.lookAt(0, 0, 0);
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(() => this.animate());
    }
  }

  const galleryHall = new MemoryHall($('#s-gallery'));
  const bookModel = new PhysicalBookModel($('#book3d'));

  document.addEventListener('click', event => {
    const audioJump = event.target.closest('[data-audio-round]');
    if (audioJump) {
      const round = clamp(Number(audioJump.dataset.audioRound), 0, interview.length - 1);
      queue.mode = 'full';
      queue.index = round * 2 + 1;
      playQueueClip();
      return;
    }
    const goButton = event.target.closest('[data-go]');
    if (goButton) {
      go(goButton.dataset.go);
      return;
    }
    const navButton = event.target.closest('[data-nav]');
    if (navButton) {
      go(navButton.dataset.nav);
      return;
    }
    if (event.target.closest('[data-back]')) return back();
    const toastButton = event.target.closest('[data-toast]');
    if (toastButton) return toast(toastButton.dataset.toast);
    if (event.target.closest('[data-close-detail]')) return closeDetail();
    if (event.target.closest('[data-audio-toggle]')) return toggleAudio();
  });

  $('#createNext').addEventListener('click', () => {
    if (createStep < 2) {
      createStep += 1;
      renderCreateStep();
      return;
    }
    go('s-invite-sent');
  });
  $('#createPrev').addEventListener('click', () => { createStep = Math.max(0, createStep - 1); renderCreateStep(); });
  $$('.suggestion-chips button').forEach(button => button.addEventListener('click', () => {
    $('#questionInput').value = button.dataset.question;
    askState.question = button.dataset.question;
    syncQuestionUI();
  }));
  $('#questionInput').addEventListener('input', () => {
    askState.question = $('#questionInput').value;
    syncQuestionUI();
  });

  $('#nextQuestion').addEventListener('click', () => {
    if (interviewIndex === interview.length - 1) return;
    const next = interviewIndex + 1;
    renderInterview(next);
    if (!audio.paused && queue.mode === 'full') {
      queue.index = next * 2;
      playQueueClip();
    }
  });
  $('#interviewContext').addEventListener('click', event => {
    const button = event.currentTarget;
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    button.classList.toggle('is-expanded', !expanded);
  });
  $('#copyInterviewLink').addEventListener('click', copyInterviewShareLink);
  $('#shareInterviewLink').addEventListener('click', shareInterviewLink);
  $('#wechatShareLink').addEventListener('click', shareInterviewLink);
  $('#openInterviewLink').addEventListener('click', () => { location.href = interviewShareUrl(); });
  $('#confirmMemory').addEventListener('click', confirmMemory);
  const privacyToggle = $('#privacyScopeToggle');
  if (privacyToggle) {
    privacyToggle.addEventListener('click', () => {
      const pressed = privacyToggle.getAttribute('aria-pressed') !== 'true';
      privacyToggle.setAttribute('aria-pressed', String(pressed));
      $('#privacyScopeLabel').textContent = pressed ? '仅 4 位受邀家人可见' : '家庭内可分享（演示）';
      $('.privacy-summary .icon use').setAttribute('href', pressed ? '#i-lock' : '#i-share');
      toast(pressed ? '这段记忆仅家人可见' : '已切换为家庭内可分享（演示）');
    });
  }
  $('#bookPrev').addEventListener('click', () => turnBook(-1));
  $('#bookNext').addEventListener('click', () => turnBook(1));

  let swipeStart = null;
  $('#singleBook').addEventListener('pointerdown', event => { swipeStart = event.clientX; });
  $('#singleBook').addEventListener('pointerup', event => {
    if (swipeStart === null) return;
    const distance = event.clientX - swipeStart;
    swipeStart = null;
    if (Math.abs(distance) < 48) return;
    turnBook(distance < 0 ? 1 : -1);
  });

  $$('.customizer-tabs button').forEach(button => button.addEventListener('click', () => {
    const tab = button.dataset.customTab;
    $$('.customizer-tabs button').forEach(item => item.classList.toggle('is-on', item === button));
    $$('.customizer-panel').forEach(panel => panel.classList.toggle('is-on', panel.dataset.customPanel === tab));
  }));
  $$('[data-book-view]').forEach(button => button.addEventListener('click', () => {
    $$('[data-book-view]').forEach(item => item.classList.toggle('is-on', item === button));
    bookModel?.setView(button.dataset.bookView);
  }));
  $$('[data-cover-style]').forEach(button => button.addEventListener('click', () => {
    $$('[data-cover-style]').forEach(item => item.classList.toggle('is-selected', item === button));
    bookModel.coverStyle = button.dataset.coverStyle;
    bookModel.drawCover();
    bookModel.build();
    const names = { blueprint: '蓝印白布', archive: '文儒坊档案', linen: '米白布纹' };
    $('#summaryCover').textContent = names[bookModel.coverStyle];
  }));
  $$('[data-package-style]').forEach(button => button.addEventListener('click', () => {
    $$('[data-package-style]').forEach(item => item.classList.toggle('is-selected', item === button));
    bookModel.packageStyle = button.dataset.packageStyle;
    bookModel.build();
    const names = { indigo: '蓝印花布书函', drawer: '深木抽拉盒', cloth: '亚麻翻盖盒' };
    $('#summaryPackage').textContent = names[bookModel.packageStyle];
  }));

  audio.addEventListener('play', updateAudioUI);
  audio.addEventListener('pause', updateAudioUI);
  audio.addEventListener('timeupdate', updateAudioUI);
  audio.addEventListener('ended', () => {
    const clips = playlists[queue.mode];
    if (queue.index < clips.length - 1) {
      queue.index += 1;
      playQueueClip();
    } else {
      updateAudioUI();
    }
  });
  addEventListener('resize', () => bookModel?.resize());
  document.addEventListener('keydown', event => {
    if (currentScreen === 's-book' && event.key === 'ArrowLeft') turnBook(-1);
    if (currentScreen === 's-book' && event.key === 'ArrowRight') turnBook(1);
    if (event.key === 'Escape' && !$('#detailSheet').hidden) closeDetail();
  });

  // soft-UI 按压反馈：全局委托，不逐按钮绑定；reduced-motion 时只保留状态类不出声
  (function pressFeedback() {
    let audioContext = null;
    const playTone = kind => {
      if (reducedMotion) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audioContext ||= new AudioContextClass();
        if (audioContext.state === 'suspended') audioContext.resume();
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const isPress = kind === 'press';
        oscillator.type = isPress ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(isPress ? 150 : 250, now);
        oscillator.frequency.exponentialRampToValueAtTime(isPress ? 95 : 420, now + (isPress ? 0.045 : 0.06));
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(isPress ? 0.02 : 0.015, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (isPress ? 0.045 : 0.06));
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.08);
      } catch { /* 音频上下文不可用则静默 */ }
    };
    document.addEventListener('pointerdown', event => {
      const button = event.target.closest('button:not(:disabled)');
      if (!button) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      button.classList.remove('is-rebounding');
      button.classList.add('is-pressing');
      playTone('press');
    });
    const releaseButton = (event, withTone = true) => {
      const button = event.target.closest('button:not(:disabled)');
      if (!button || !button.classList.contains('is-pressing')) return;
      button.classList.remove('is-pressing');
      if (withTone) playTone('release');
      if (reducedMotion || !withTone) return;
      void button.offsetWidth;
      button.classList.add('is-rebounding');
    };
    document.addEventListener('pointerup', event => releaseButton(event));
    document.addEventListener('pointercancel', event => releaseButton(event, false));
    document.addEventListener('animationend', event => {
      if (event.animationName === 'control-rebound') event.target.classList.remove('is-rebounding');
    });
  })();

  buildWaveform();
  renderCreateStep();
  syncQuestionUI();
  renderInterview();
  renderBookPage(false);
  setShell($('#s-family'));
  updateInterviewShareLink();

  window.SG = {
    go,
    toast,
    openDetail,
    unlockAudio,
    toggleAudio,
    memories
  };

  if (new URLSearchParams(location.search).get('invite') === 'chen-wenrufang') {
    document.title = '小陈邀请您聊聊往事 · 时光回响';
    go('s-elder-invite', { replace: true });
  }
})();
