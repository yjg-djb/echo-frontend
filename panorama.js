(() => {
  'use strict';

  const T = window.THREE;
  const sec = document.getElementById('s-home');
  const room = document.getElementById('glRoom');
  const canvas = document.getElementById('gl');
  const spotBox = sec?.querySelector('.hud__spots');
  const hud = sec?.querySelector('.hud');
  const arrival = sec?.querySelector('.hud__arrival');
  const stageChip = document.getElementById('roomStage');
  const spacer = sec?.querySelector('.hall__spacer');
  const legacyBoot = document.getElementById('glBoot');
  const legacyError = document.getElementById('glErr');

  if (!T || !sec || !room || !canvas || !spotBox || !stageChip || !spacer) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const smooth = t => t * t * (3 - 2 * t);
  const wrapAngle = v => Math.atan2(Math.sin(v), Math.cos(v));
  const maxScroll = 3200;
  const MAX_PITCH = T.MathUtils.degToRad(85);

  const SCENES = [
    {
      id: 'courtyard-aerial',
      title: '院落高点',
      stage: '俯瞰坐标 · 360° 写实院落',
      src: 'assets/panoramas/courtyard-overlook-360.webp',
      thumb: 'assets/panoramas/courtyard-overlook-360-thumb.webp',
      yaw: 0,
      pitch: -0.44,
      fov: 90,
      scroll: 0,
      hotspots: [
        { label: '走到院门', sub: '进入第 2 个坐标', yaw: -0.35, pitch: -0.16, scene: 1 },
        { label: '心形的树', sub: '阿公 1992 年种下', yaw: 0, pitch: -0.26, scene: 2 }
      ]
    },
    {
      id: 'gate-entry',
      title: '院门入口',
      stage: '院门之内 · 回望完整院落',
      src: 'assets/panoramas/gate-entry.webp',
      thumb: 'assets/panoramas/gate-entry-thumb.webp',
      yaw: 0.36,
      pitch: -0.08,
      fov: 90,
      scroll: 0.18,
      hotspots: [
        { label: '走到心树旁', sub: '穿过石板庭院', yaw: 0.52, pitch: 0.02, scene: 2 },
        { label: '回看院门', sub: '来时的方向', yaw: -2.75, pitch: -0.02, toast: '院门外，是每一次回家的路' }
      ]
    },
    {
      id: 'heart-tree',
      title: '心树近景',
      stage: '心树之下 · 向四周看看',
      src: 'assets/panoramas/heart-tree.webp',
      thumb: 'assets/panoramas/heart-tree-thumb.webp',
      yaw: 0,
      pitch: -0.05,
      fov: 88,
      scroll: 0.36,
      hotspots: [
        { label: '走到堂屋门前', sub: '进入第 4 个坐标', yaw: 0.36, pitch: -0.02, scene: 3 },
        { label: '这棵心形的树', sub: '听阿公讲 1992 年', yaw: 0, pitch: 0.16, toast: '这棵树会记得每一次回家' }
      ]
    },
    {
      id: 'hall-threshold',
      title: '堂屋门槛',
      stage: '一扇门 · 同时连接院落与记忆馆',
      src: 'assets/panoramas/hall-threshold.webp',
      thumb: 'assets/panoramas/hall-threshold-thumb.webp',
      yaw: 0,
      pitch: -0.02,
      fov: 90,
      scroll: 0.56,
      hotspots: [
        { label: '回望心树', sub: '院落方向', yaw: 0, pitch: 0.02, scene: 2 },
        { label: '走进堂屋', sub: '家庭记忆馆', yaw: Math.PI, pitch: -0.02, scene: 4 }
      ]
    },
    {
      id: 'hall-center',
      title: '堂屋中央',
      stage: '堂屋之内 · 家庭记忆馆',
      src: 'assets/panoramas/hall-center.webp',
      thumb: 'assets/panoramas/hall-center-thumb.webp',
      yaw: 0.95,
      pitch: -0.04,
      fov: 90,
      scroll: 0.73,
      hotspots: [
        { label: '记忆照片墙', sub: '12 段已确认回忆', yaw: 1.02, pitch: 0.05, scene: 5 },
        { label: '讲述者原声', sub: '真实录音依据', yaw: -2.05, pitch: -0.08, go: 's-interview' },
        { label: 'AI 对话', sub: '非本人 · 有依据回答', yaw: 0.35, pitch: -0.16, toast: 'AI 对话只使用爸爸已确认的记忆' },
        { label: '家族相册', sub: '持续的记忆计划', yaw: 1.55, pitch: -0.08, go: 's-plan' }
      ]
    },
    {
      id: 'memory-wall',
      title: '照片墙前',
      stage: '记忆照片墙 · 点亮一段往事',
      src: 'assets/panoramas/memory-wall.webp',
      thumb: 'assets/panoramas/memory-wall-thumb.webp',
      yaw: 0,
      pitch: 0.02,
      fov: 86,
      scroll: 0.92,
      hotspots: [
        { label: '老房子的故事', sub: '1986 · 仓山', yaw: 0, pitch: 0.13, detail: 'm1' },
        { label: '听听爸爸的声音', sub: '真实原声 · 02:36', yaw: 0.42, pitch: -0.2, toast: '原声已保存 · 老房子的故事' },
        { label: '走进记忆长廊', sub: '查看全部 12 段', yaw: -0.45, pitch: -0.16, go: 's-gallery' }
      ]
    }
  ];

  legacyBoot.hidden = true;
  legacyError.hidden = true;
  spacer.style.height = `${maxScroll}px`;

  const loaderEl = document.createElement('div');
  loaderEl.className = 'pano-loader';
  loaderEl.innerHTML = `
    <div class="pano-loader__eyebrow">PHOTO-REAL MEMORY SPACE</div>
    <div class="pano-loader__title">正在唤醒林家的老宅</div>
    <div class="pano-loader__sub">院落先抵达，堂屋会在漫步时继续加载</div>
    <div class="pano-loader__track"><i class="pano-loader__bar"></i></div>
    <div class="pano-loader__value">04%</div>`;
  room.appendChild(loaderEl);

  const gradeEl = document.createElement('div');
  gradeEl.className = 'pano-grade';
  const grainEl = document.createElement('div');
  grainEl.className = 'pano-grain';
  const curtainEl = document.createElement('div');
  curtainEl.className = 'pano-curtain';
  curtainEl.innerHTML = '<div class="pano-curtain__mark">MEMORY NODE</div><div class="pano-curtain__title">院落俯瞰</div>';
  const progressEl = document.createElement('div');
  progressEl.className = 'pano-progress';
  progressEl.innerHTML = '<i></i>';
  const qualityEl = document.createElement('div');
  qualityEl.className = 'pano-quality';
  qualityEl.textContent = 'IPHONE · HIGH';
  const nodeNav = document.createElement('div');
  nodeNav.className = 'pano-node-nav';
  nodeNav.setAttribute('aria-label', '写实家馆观景点');
  SCENES.forEach((scene, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.ariaLabel = scene.title;
    button.addEventListener('click', () => scrollToScene(index));
    nodeNav.appendChild(button);
  });

  const overviewButton = document.createElement('button');
  overviewButton.type = 'button';
  overviewButton.className = 'pano-overview-trigger';
  overviewButton.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-photo"/></svg><span>全景总览</span>';
  const introSkip = document.createElement('button');
  introSkip.type = 'button';
  introSkip.className = 'pano-intro-skip';
  introSkip.textContent = '跳过鸟瞰镜头';
  introSkip.hidden = true;

  const heroIntroEl = document.createElement('div');
  heroIntroEl.className = 'pano-hero-intro';
  heroIntroEl.hidden = true;
  heroIntroEl.innerHTML = '<img src="assets/hero/courtyard-overlook.png" alt="徽派院落、院门和心形树的高处俯瞰全景">';

  const lookControls = document.createElement('div');
  lookControls.className = 'pano-look-controls';
  lookControls.setAttribute('aria-label', '全景视角控制');
  lookControls.innerHTML = `
    <button type="button" data-look="up" aria-label="向上看"><svg class="icon" aria-hidden="true"><use href="#i-up"/></svg></button>
    <button type="button" data-look="left" aria-label="向左看"><svg class="icon" aria-hidden="true"><use href="#i-back"/></svg></button>
    <button type="button" data-look="right" aria-label="向右看"><svg class="icon" aria-hidden="true"><use href="#i-chev"/></svg></button>
    <button type="button" data-look="down" aria-label="向下看"><svg class="icon" aria-hidden="true"><use href="#i-down"/></svg></button>`;

  const overviewEl = document.createElement('div');
  overviewEl.className = 'pano-overview';
  overviewEl.setAttribute('role', 'dialog');
  overviewEl.setAttribute('aria-modal', 'true');
  overviewEl.setAttribute('aria-label', '院落全景总览');
  overviewEl.innerHTML = `
    <div class="pano-overview__panel">
      <div class="pano-overview__head"><strong>院落全景总览</strong><span>2:1 · 360° SPHERE</span><button type="button" class="pano-overview__close" aria-label="关闭全景总览"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button></div>
      <img src="${SCENES[0].src}" alt="林家徽派院落、心形树与四周建筑的完整二比一球面全景">
      <p>网页中的画面是这张球面全景的透视切片。左右环视一整圈，上下可以看到屋顶、天空和脚下石板。</p>
    </div>`;

  room.append(gradeEl, grainEl, heroIntroEl, curtainEl, progressEl, qualityEl, nodeNav, overviewButton, introSkip, lookControls, overviewEl);

  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new T.Scene();
  scene.background = new T.Color(0x120f0b);
  const camera = new T.PerspectiveCamera(90, 1, 0.1, 120);
  const geometry = new T.SphereGeometry(50, 96, 64);
  geometry.scale(-1, 1, 1);
  const materials = [0, 1].map(() => new T.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false
  }));
  const spheres = materials.map((material, index) => {
    const mesh = new T.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;
    mesh.renderOrder = index;
    mesh.visible = index === 0;
    scene.add(mesh);
    return mesh;
  });

  const textures = new Map();
  let currentScene = -1;
  let requestedScene = 0;
  let transitionToken = 0;
  let transitionLocked = false;
  let activeLayer = 0;
  let cinema = null;
  let openingPlayed = false;
  let active = false;
  let raf = 0;
  let yaw = 0;
  let pitch = -0.16;
  let targetYaw = yaw;
  let targetPitch = pitch;
  let targetFov = 90;
  let velocityYaw = 0;
  let velocityPitch = 0;
  let dragging = false;
  let dragMode = '';
  let pointerX = 0;
  let pointerY = 0;
  let startX = 0;
  let startY = 0;
  let pixelRatio = Math.min(devicePixelRatio || 1, 1.75);
  let frameCount = 0;
  let frameWindow = performance.now();

  function setLoaderProgress(value) {
    const progress = clamp(Math.round(value), 4, 100);
    loaderEl.querySelector('.pano-loader__bar').style.width = `${progress}%`;
    loaderEl.querySelector('.pano-loader__value').textContent = `${String(progress).padStart(2, '0')}%`;
  }

  async function fetchImage(src, onProgress) {
    if (location.protocol === 'file:') return src;
    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${src}`);
    const total = Number(response.headers.get('content-length')) || 0;
    if (!response.body || !total) return URL.createObjectURL(await response.blob());
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress?.(loaded / total);
    }
    return URL.createObjectURL(new Blob(chunks, { type: response.headers.get('content-type') || 'image/webp' }));
  }

  async function loadTexture(index, onProgress) {
    if (textures.has(index)) return textures.get(index);
    const generatedUrl = await fetchImage(SCENES[index].src, onProgress);
    const image = new Image();
    image.decoding = 'async';
    image.src = generatedUrl;
    await image.decode();
    const texture = new T.Texture(image);
    texture.encoding = T.sRGBEncoding;
    texture.needsUpdate = true;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.set(index, texture);
    if (generatedUrl.startsWith('blob:')) URL.revokeObjectURL(generatedUrl);
    return texture;
  }

  function setSceneOrientation(index, instant = false) {
    const node = SCENES[index];
    targetYaw = node.yaw;
    targetPitch = node.pitch;
    targetFov = node.fov;
    if (instant || reduced) {
      yaw = targetYaw;
      pitch = targetPitch;
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
  }

  function transitionMode(from, to) {
    const fromId = SCENES[from]?.id || '';
    const toId = SCENES[to]?.id || '';
    if (fromId === 'hall-threshold' || toId === 'hall-threshold' || (fromId === 'heart-tree' && toId === 'hall-center')) return 'door';
    if (fromId === 'memory-wall' || toId === 'memory-wall') return 'gallery';
    return 'tree';
  }

  function finishOpeningIntro() {
    cinema = null;
    room.classList.remove('is-intro');
    introSkip.hidden = true;
    heroIntroEl.classList.remove('is-on');
    heroIntroEl.hidden = true;
    heroIntroEl.style.removeProperty('opacity');
    heroIntroEl.firstElementChild.style.removeProperty('transform');
    setSceneOrientation(0, true);
    buildHotspots(0);
    updateSceneUI(0);
  }

  function startOpeningIntro() {
    if (openingPlayed) return;
    openingPlayed = true;
    if (reduced) {
      finishOpeningIntro();
      return;
    }
    room.classList.add('is-intro');
    introSkip.hidden = false;
    heroIntroEl.hidden = false;
    heroIntroEl.classList.add('is-on');
    heroIntroEl.style.opacity = '1';
    spotBox.replaceChildren();
    const node = SCENES[0];
    cinema = {
      kind: 'intro',
      started: performance.now(),
      duration: 2200,
      fromYaw: -0.16,
      fromPitch: -0.72,
      fromFov: 112,
      toYaw: node.yaw,
      toPitch: node.pitch,
      toFov: node.fov
    };
    yaw = targetYaw = cinema.fromYaw;
    pitch = targetPitch = cinema.fromPitch;
    camera.fov = targetFov = cinema.fromFov;
    camera.updateProjectionMatrix();
  }

  function skipOpeningIntro() {
    if (cinema?.kind !== 'intro') return;
    finishOpeningIntro();
  }

  function finishSceneCinema(state) {
    materials[state.fromLayer].opacity = 0;
    spheres[state.fromLayer].visible = false;
    materials[state.toLayer].opacity = 1;
    activeLayer = state.toLayer;
    currentScene = state.toScene;
    cinema = null;
    transitionLocked = false;
    curtainEl.classList.remove('is-cinema');
    curtainEl.style.removeProperty('--cinema-opacity');
    setSceneOrientation(currentScene, true);
    buildHotspots(currentScene);
    updateSceneUI(currentScene);
    if (requestedScene !== currentScene) activateScene(requestedScene);
  }

  function startSceneCinema(index, texture) {
    const nextLayer = 1 - activeLayer;
    const nextMaterial = materials[nextLayer];
    nextMaterial.map = texture;
    nextMaterial.needsUpdate = true;
    nextMaterial.opacity = 0;
    spheres[nextLayer].visible = true;
    spheres[nextLayer].renderOrder = 2;
    spheres[activeLayer].renderOrder = 1;
    transitionLocked = true;
    spotBox.replaceChildren();
    const node = SCENES[index];
    curtainEl.dataset.mode = transitionMode(currentScene, index);
    curtainEl.querySelector('.pano-curtain__title').textContent = node.title;
    curtainEl.classList.add('is-cinema');
    cinema = {
      kind: 'scene',
      started: performance.now(),
      duration: 1250,
      fromScene: currentScene,
      toScene: index,
      fromLayer: activeLayer,
      toLayer: nextLayer,
      fromYaw: yaw,
      fromPitch: pitch,
      fromFov: camera.fov,
      toYaw: node.yaw,
      toPitch: node.pitch,
      toFov: node.fov
    };
  }

  function updateCinema(now) {
    if (!cinema) return false;
    const state = cinema;
    const progress = clamp((now - state.started) / state.duration, 0, 1);
    const eased = smooth(progress);
    yaw = state.fromYaw + wrapAngle(state.toYaw - state.fromYaw) * eased;
    pitch = lerp(state.fromPitch, state.toPitch, eased);

    if (state.kind === 'intro') {
      camera.fov = lerp(state.fromFov, state.toFov, eased);
      const heroFade = smooth(clamp((progress - 0.48) / 0.46, 0, 1));
      heroIntroEl.style.opacity = String(1 - heroFade);
      heroIntroEl.firstElementChild.style.transform = `scale(${1 + progress * 0.065}) translateY(${-progress * 1.4}%)`;
      if (progress >= 1) finishOpeningIntro();
      return true;
    }

    materials[state.fromLayer].opacity = 1 - eased;
    materials[state.toLayer].opacity = eased;
    const midpointFov = Math.max(50, Math.min(state.fromFov, state.toFov) - 14);
    camera.fov = progress < 0.5
      ? lerp(state.fromFov, midpointFov, smooth(progress * 2))
      : lerp(midpointFov, state.toFov, smooth((progress - 0.5) * 2));
    curtainEl.style.setProperty('--cinema-opacity', String(Math.sin(Math.PI * progress) * 0.58));
    if (progress >= 1) finishSceneCinema(state);
    return true;
  }

  async function activateScene(index, instant = false) {
    index = clamp(index, 0, SCENES.length - 1);
    requestedScene = index;
    if (index === currentScene && materials[activeLayer].map) return;
    if (transitionLocked) return;
    const token = ++transitionToken;
    let texture;
    try {
      texture = await loadTexture(index);
    } catch (error) {
      console.error(error);
      legacyError.hidden = false;
      legacyError.querySelector('small').textContent = `场景加载失败：${error.message}`;
      return;
    }
    if (token !== transitionToken || requestedScene !== index) return;
    if (instant || reduced || currentScene < 0) {
      materials[activeLayer].map = texture;
      materials[activeLayer].needsUpdate = true;
      materials[activeLayer].opacity = 1;
      spheres[activeLayer].visible = true;
      currentScene = index;
      setSceneOrientation(index, true);
      buildHotspots(index);
      updateSceneUI(index);
      return;
    }
    startSceneCinema(index, texture);
  }

  function buildHotspots(index) {
    spotBox.replaceChildren();
    SCENES[index].hotspots.forEach((hotspot, order) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pano-hotspot';
      button.dataset.order = String(order);
      button.innerHTML = `<span class="pano-hotspot__ring"></span><span class="pano-hotspot__text">${hotspot.label}<small>${hotspot.sub}</small></span>`;
      button.addEventListener('click', event => {
        event.stopPropagation();
        if (Number.isInteger(hotspot.scene)) scrollToScene(hotspot.scene);
        else if (hotspot.go) window.SG?.go(hotspot.go);
        else if (hotspot.detail) window.SG?.openDetail(hotspot.detail);
        else if (hotspot.toast) window.SG?.toast(hotspot.toast);
      });
      spotBox.appendChild(button);
      hotspot.element = button;
    });
  }

  function updateSceneUI(index) {
    const node = SCENES[index];
    const last = index === SCENES.length - 1;
    stageChip.innerHTML = `<span class="led ${last ? 'on-g' : 'on-a'}"></span><span>${node.stage}</span>`;
    [...nodeNav.children].forEach((button, i) => button.classList.toggle('is-active', i === index));
    arrival.classList.toggle('is-on', last);
  }

  function sceneForProgress(progress) {
    let index = 0;
    for (let i = 1; i < SCENES.length; i += 1) {
      const threshold = (SCENES[i - 1].scroll + SCENES[i].scroll) / 2;
      if (progress >= threshold) index = i;
    }
    return index;
  }

  function onScroll() {
    const progress = clamp(sec.scrollTop / maxScroll, 0, 1);
    if (cinema?.kind === 'intro' && sec.scrollTop > 20) skipOpeningIntro();
    hud.classList.toggle('is-moved', sec.scrollTop > 40);
    progressEl.firstElementChild.style.width = `${progress * 100}%`;
    const index = sceneForProgress(progress);
    if (index !== requestedScene) activateScene(index);
  }

  function scrollToScene(index) {
    if (cinema?.kind === 'intro') skipOpeningIntro();
    const from = sec.scrollTop;
    const goal = SCENES[index].scroll * maxScroll;
    const delta = goal - from;
    const started = performance.now();
    const duration = reduced ? 1 : 900;
    const step = now => {
      const progress = clamp((now - started) / duration, 0, 1);
      sec.scrollTop = from + delta * ease(progress);
      onScroll();
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function directionFor(viewYaw, viewPitch, radius = 10) {
    const cosPitch = Math.cos(viewPitch);
    return new T.Vector3(
      radius * cosPitch * Math.cos(viewYaw),
      radius * Math.sin(viewPitch),
      radius * cosPitch * Math.sin(viewYaw)
    );
  }

  function renderHotspots() {
    if (currentScene < 0) return;
    const node = SCENES[currentScene];
    const forward = new T.Vector3();
    camera.getWorldDirection(forward);
    const width = room.clientWidth;
    const height = room.clientHeight;
    node.hotspots.forEach(hotspot => {
      if (!hotspot.element) return;
      const world = directionFor(hotspot.yaw, hotspot.pitch);
      const visible = world.clone().normalize().dot(forward) > 0.14;
      world.project(camera);
      const inFrame = visible && world.z > -1 && world.z < 1 && Math.abs(world.x) < 1.1 && Math.abs(world.y) < 1.15;
      hotspot.element?.classList.toggle('is-visible', inFrame);
      if (inFrame) {
        hotspot.element.style.left = `${(world.x * 0.5 + 0.5) * width}px`;
        hotspot.element.style.top = `${(-world.y * 0.5 + 0.5) * height}px`;
      }
    });
  }

  function resize() {
    const width = room.clientWidth;
    const height = room.clientHeight;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function updateQuality(now) {
    frameCount += 1;
    const elapsed = now - frameWindow;
    if (elapsed < 2200) return;
    const fps = frameCount * 1000 / elapsed;
    if (fps < 28 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      resize();
      qualityEl.textContent = 'IPHONE · BALANCED';
    } else if (fps > 48 && pixelRatio < Math.min(devicePixelRatio || 1, 1.75)) {
      pixelRatio = Math.min(1.75, pixelRatio + 0.25);
      resize();
      qualityEl.textContent = 'IPHONE · HIGH';
    }
    frameCount = 0;
    frameWindow = now;
  }

  function render(now) {
    if (!active) return;
    raf = requestAnimationFrame(render);
    const cinematic = updateCinema(now);
    if (!cinematic) {
      if (!dragging) {
        targetYaw += velocityYaw;
        targetPitch = clamp(targetPitch + velocityPitch, -MAX_PITCH, MAX_PITCH);
        velocityYaw *= 0.84;
        velocityPitch *= 0.82;
      }
      yaw += wrapAngle(targetYaw - yaw) * (reduced ? 1 : 0.105);
      pitch += (targetPitch - pitch) * (reduced ? 1 : 0.105);
      camera.fov += (targetFov - camera.fov) * 0.09;
    }
    camera.updateProjectionMatrix();
    camera.position.set(Math.cos(yaw) * 0.025, Math.sin(pitch) * 0.015, Math.sin(yaw) * 0.025);
    camera.lookAt(directionFor(yaw, pitch, 1));
    renderHotspots();
    renderer.render(scene, camera);
    updateQuality(now);
  }

  function nudgeView(horizontal, vertical) {
    if (cinema) return;
    targetYaw += horizontal;
    targetPitch = clamp(targetPitch + vertical, -MAX_PITCH, MAX_PITCH);
    velocityYaw = velocityPitch = 0;
  }

  overviewButton.addEventListener('click', () => {
    overviewEl.classList.add('is-on');
    overviewEl.querySelector('.pano-overview__close').focus();
  });
  overviewEl.addEventListener('click', event => {
    if (event.target === overviewEl || event.target.closest('.pano-overview__close')) {
      overviewEl.classList.remove('is-on');
      overviewButton.focus();
    }
  });
  introSkip.addEventListener('click', skipOpeningIntro);
  lookControls.addEventListener('click', event => {
    const button = event.target.closest('[data-look]');
    if (!button) return;
    const stepYaw = T.MathUtils.degToRad(32);
    const stepPitch = T.MathUtils.degToRad(20);
    if (button.dataset.look === 'left') nudgeView(-stepYaw, 0);
    if (button.dataset.look === 'right') nudgeView(stepYaw, 0);
    if (button.dataset.look === 'up') nudgeView(0, stepPitch);
    if (button.dataset.look === 'down') nudgeView(0, -stepPitch);
  });

  room.addEventListener('pointerdown', event => {
    if (cinema || event.target.closest('button')) return;
    dragging = true;
    dragMode = '';
    pointerX = startX = event.clientX;
    pointerY = startY = event.clientY;
    velocityYaw = velocityPitch = 0;
    room.classList.add('is-dragging');
    room.setPointerCapture?.(event.pointerId);
  });
  room.addEventListener('pointermove', event => {
    if (!dragging) return;
    const totalX = event.clientX - startX;
    const totalY = event.clientY - startY;
    if (!dragMode && Math.hypot(totalX, totalY) > 8) dragMode = Math.abs(totalX) >= Math.abs(totalY) ? 'look' : 'scroll';
    if (dragMode !== 'look') return;
    const dx = event.clientX - pointerX;
    const dy = event.clientY - pointerY;
    const yawDelta = -dx * 0.0036;
    const pitchDelta = dy * 0.0024;
    targetYaw += yawDelta;
    targetPitch = clamp(targetPitch + pitchDelta, -MAX_PITCH, MAX_PITCH);
    velocityYaw = yawDelta * 0.18;
    velocityPitch = pitchDelta * 0.16;
    pointerX = event.clientX;
    pointerY = event.clientY;
    event.preventDefault();
  }, { passive: false });
  const releasePointer = () => {
    dragging = false;
    dragMode = '';
    room.classList.remove('is-dragging');
  };
  room.addEventListener('pointerup', releasePointer);
  room.addEventListener('pointercancel', releasePointer);
  room.addEventListener('wheel', event => {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      targetYaw -= event.deltaX * 0.0015;
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('keydown', event => {
    if (!sec.classList.contains('is-active')) return;
    if (event.key === 'Escape' && overviewEl.classList.contains('is-on')) {
      overviewEl.classList.remove('is-on');
      overviewButton.focus();
      return;
    }
    const stepYaw = T.MathUtils.degToRad(18);
    const stepPitch = T.MathUtils.degToRad(14);
    if (event.key === 'ArrowLeft') nudgeView(-stepYaw, 0);
    else if (event.key === 'ArrowRight') nudgeView(stepYaw, 0);
    else if (event.key === 'ArrowUp') nudgeView(0, stepPitch);
    else if (event.key === 'ArrowDown') nudgeView(0, -stepPitch);
    else return;
    event.preventDefault();
  });

  sec.addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) window.__manor?.deactivate();
    else if (sec.classList.contains('is-active')) window.__manor?.activate();
  });

  window.__manor = {
    activate() {
      active = true;
      resize();
      onScroll();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    },
    deactivate() {
      active = false;
      cancelAnimationFrame(raf);
    },
    goTo(index) {
      scrollToScene(index);
    },
    get state() {
      return {
        currentScene,
        requestedScene,
        yaw,
        pitch,
        targetYaw,
        targetPitch,
        dragging,
        dragMode,
        cinema: cinema?.kind || null,
        maxPitch: MAX_PITCH,
        fov: camera.fov,
        layerOpacity: materials.map(item => item.opacity),
        pixelRatio,
        loaded: textures.size
      };
    }
  };

  resize();
  loadTexture(0, ratio => setLoaderProgress(6 + ratio * 82))
    .then(texture => {
      materials[activeLayer].map = texture;
      materials[activeLayer].needsUpdate = true;
      materials[activeLayer].opacity = 1;
      currentScene = requestedScene = 0;
      setSceneOrientation(0, true);
      updateSceneUI(0);
      setLoaderProgress(100);
      loaderEl.classList.add('is-done');
      if (window.__manorPending || sec.classList.contains('is-active')) window.__manor.activate();
      startOpeningIntro();
      SCENES.slice(1).forEach((_, offset) => loadTexture(offset + 1).catch(() => {}));
    })
    .catch(error => {
      console.error(error);
      loaderEl.querySelector('.pano-loader__title').textContent = '场景没有成功抵达';
      loaderEl.querySelector('.pano-loader__sub').textContent = error.message;
      legacyError.hidden = false;
    });
})();
