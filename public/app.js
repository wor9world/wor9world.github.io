const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Shell: '#89e051',
  PowerShell: '#012456',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
  'C#': '#178600',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Lua: '#000080',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Astro: '#ff5a03',
  Jupyter: '#DA5B0B',
  'Jupyter Notebook': '#DA5B0B',
  Dockerfile: '#384d54',
  Makefile: '#427819',
  Nix: '#7e7eff',
  Zig: '#ec915c',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  R: '#198CE7',
  MDX: '#fcb32c',
};

const PALETTE = ['#2da44e', '#0969da', '#8250df', '#bf3989', '#bc4c00', '#1a7f37', '#6e7781'];

const ICONS = {
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1L3.2 9.4l6.1-.9Z"/></svg>',
  fork: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v1.5A2.5 2.5 0 0 0 8.5 11h7a2.5 2.5 0 0 0 2.5-2.5V7M12 13.5V17"/></svg>',
  commit: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  archive: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8M10 12h4"/></svg>',
  repo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V6a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2Z"/><path d="M4 19a2 2 0 0 1 2-2h12"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>',
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.4 3.8 5.5 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.5-3.8-9S9.5 5.4 12 3Z"/></svg>',
};

const CONFIG = window.GITHUB_HOME || {};
const STATIC_USER = CONFIG.user || '';
const STATIC_CACHE_KEY = `gh-home:${STATIC_USER}`;

const state = {
  profile: null,
  repos: [],
  query: '',
  language: 'all',
  sort: 'pushed',
  view: localStorage.getItem('repo-view') === 'list' ? 'list' : 'grid',
  loading: true,
  fetchedAt: null,
  source: 'server',
};

const $ = (id) => document.getElementById(id);
const refs = {
  brandAvatar: $('brand-avatar'),
  brandLogin: $('brand-login'),
  breadcrumbLogin: $('breadcrumb-login'),
  profileLink: $('profile-link'),
  heroAvatar: $('hero-avatar'),
  metaLogin: $('meta-login'),
  metaFollowers: $('meta-followers'),
  metaFollowing: $('meta-following'),
  metaSince: $('meta-since'),
  metaLocation: $('meta-location'),
  railAvatar: $('rail-avatar'),
  railName: $('rail-name'),
  railLogin: $('rail-login'),
  railFollowers: $('rail-followers'),
  railFollowing: $('rail-following'),
  railProfileLink: $('rail-profile-link'),
  railFetched: $('rail-fetched'),
  languageBreakdown: $('language-breakdown'),
  sideNoteTitle: $('side-note-title'),
  sideNoteDesc: $('side-note-desc'),
  statRepos: $('stat-repos'),
  statStars: $('stat-stars'),
  statForks: $('stat-forks'),
  statLanguages: $('stat-languages'),
  resultCount: $('result-count'),
  toolbar: $('repo-toolbar'),
  search: $('search-input'),
  sort: $('sort-select'),
  filters: $('language-filters'),
  cards: $('repo-cards'),
  empty: $('empty-state'),
  emptyTitle: $('empty-title'),
  emptyText: $('empty-text'),
  errorBox: $('error-box'),
  errorText: $('error-text'),
  refresh: $('refresh-button'),
  retry: $('retry-button'),
  clearFilters: $('clear-filters'),
  fetchedAt: $('fetched-at'),
  footerNote: $('footer-note'),
  footerYear: $('footer-year'),
  themeToggle: $('theme-toggle'),
  viewButtons: [...document.querySelectorAll('.view-toggle__btn')],
};

/* ---------- helpers ---------- */

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function languageColor(name) {
  if (!name) return 'var(--text-tertiary)';
  if (LANGUAGE_COLORS[name]) return LANGUAGE_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

const relative = new Intl.RelativeTimeFormat('th', { numeric: 'auto' });
const UNITS = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

function timeAgo(value) {
  if (!value) return '';
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  if (Number.isNaN(seconds)) return '';
  const abs = Math.abs(seconds);
  for (const [unit, size] of UNITS) {
    if (abs >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'เมื่อสักครู่';
}

const dateFmt = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

function formatNumber(value) {
  return new Intl.NumberFormat('th-TH').format(value);
}

/* ---------- data ---------- */

function mapRestRepo(repo) {
  return {
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    url: repo.html_url,
    homepage: repo.homepage || null,
    isPrivate: repo.private,
    isFork: repo.fork,
    isArchived: repo.archived,
    isTemplate: repo.is_template,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    pushedAt: repo.pushed_at,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    language: repo.language ? { name: repo.language, color: null } : null,
    topics: repo.topics || [],
    license: repo.license?.spdx_id || null,
    latestCommit: null,
    languages: [],
  };
}

function readStaticCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(STATIC_CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.at < 120_000) return cached.data;
  } catch (_) {}
  return null;
}

async function fetchStaticData(refresh = false) {
  if (!refresh) {
    const cached = readStaticCache();
    if (cached) return cached;
  }

  const headers = { accept: 'application/vnd.github+json' };
  const base = `https://api.github.com/users/${encodeURIComponent(STATIC_USER)}`;
  const [profileRes, reposRes] = await Promise.all([
    fetch(base, { headers }),
    fetch(`${base}/repos?per_page=100&sort=pushed&type=owner`, { headers }),
  ]);

  if (!profileRes.ok || !reposRes.ok) {
    const status = !profileRes.ok ? profileRes.status : reposRes.status;
    const remaining = reposRes.headers.get('x-ratelimit-remaining');
    if (status === 403 && remaining === '0') {
      throw new Error('GitHub API ถึงขีดจำกัดชั่วคราว (rate limit) — รอสักครู่แล้วกดรีเฟรชอีกครั้ง');
    }
    if (status === 404) {
      throw new Error(`ไม่พบบัญชี GitHub "${STATIC_USER}"`);
    }
    throw new Error(`GitHub API ตอบกลับ ${status}`);
  }

  const [profile, repos] = await Promise.all([profileRes.json(), reposRes.json()]);
  const data = {
    profile: {
      login: profile.login,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      location: profile.location,
      websiteUrl: profile.blog || null,
      url: profile.html_url,
      createdAt: profile.created_at,
      followers: profile.followers ?? 0,
      following: profile.following ?? 0,
    },
    repos: (Array.isArray(repos) ? repos : []).map(mapRestRepo),
    fetchedAt: new Date().toISOString(),
    source: 'static',
  };

  try {
    localStorage.setItem(STATIC_CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch (_) {}

  return data;
}

async function fetchData(refresh) {
  const query = refresh ? '?refresh=1' : '';

  try {
    const response = await fetch(`/api/repos${query}`, { headers: { accept: 'application/json' } });
    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.hint || data.error || `HTTP ${response.status}`);
      return { ...data, source: 'server' };
    }
  } catch (error) {
    if (!STATIC_USER) throw error;
    // บน static hosting ไม่มี /api/repos — ไปดึงจาก GitHub API โดยตรงแทน
  }

  if (!STATIC_USER) {
    throw new Error('ไม่พบ API ฝั่งเซิร์ฟเวอร์ และยังไม่ได้ตั้งค่า GITHUB_HOME.user');
  }

  return fetchStaticData(refresh);
}

async function load({ refresh = false } = {}) {
  state.loading = true;
  refs.refresh.disabled = true;
  refs.refresh.classList.add('is-loading');
  refs.errorBox.hidden = true;
  refs.empty.hidden = true;
  refs.cards.setAttribute('aria-busy', 'true');

  if (!state.repos.length) renderSkeletons();

  try {
    const data = await fetchData(refresh);

    state.profile = data.profile;
    state.repos = Array.isArray(data.repos) ? data.repos : [];
    state.fetchedAt = data.fetchedAt;
    state.source = data.source || 'server';

    if (refs.footerNote) {
      refs.footerNote.textContent =
        state.source === 'static'
          ? 'Static site · GitHub Pages'
          : 'Local server · Node.js';
    }

    refs.sideNoteTitle.textContent = state.source === 'static' ? 'Static site' : 'Local server';
    refs.sideNoteDesc.textContent =
      state.source === 'static' ? 'deployed via GitHub Actions' : 'private repos visible';

    if (state.language !== 'all' && !state.repos.some((repo) => repo.language?.name === state.language)) {
      state.language = 'all';
    }

    renderProfile();
    renderStats();
    renderLanguages();
    renderFilters();
    render();
    renderFetchedAt();
  } catch (error) {
    state.loading = false;
    refs.cards.setAttribute('aria-busy', 'false');
    refs.errorText.textContent = error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
    refs.errorBox.hidden = false;

    if (!state.repos.length) {
      refs.cards.innerHTML = '';
      refs.resultCount.textContent = '';
      refs.fetchedAt.textContent = 'โหลดไม่สำเร็จ';
      refs.railFetched.textContent = 'โหลดไม่สำเร็จ';
      refs.languageBreakdown.innerHTML = '<p class="rail-empty">โหลดข้อมูลไม่สำเร็จ</p>';
    }
  } finally {
    state.loading = false;
    refs.refresh.disabled = false;
    refs.refresh.classList.remove('is-loading');
  }
}

/* ---------- render: profile ---------- */

function renderProfile() {
  const profile = state.profile;
  if (!profile) return;

  const name = profile.name || profile.login;
  document.title = `${name} · GitHub Home`;

  for (const img of [refs.brandAvatar, refs.heroAvatar, refs.railAvatar]) {
    if (profile.avatarUrl) img.src = profile.avatarUrl;
    img.alt = `รูปโปรไฟล์ของ ${name}`;
  }

  refs.brandLogin.textContent = profile.login;
  refs.profileLink.href = profile.url;
  refs.breadcrumbLogin.textContent = profile.login;
  refs.breadcrumbLogin.href = profile.url;
  refs.metaLogin.textContent = `@${profile.login}`;
  refs.metaLogin.href = profile.url;
  refs.metaFollowers.textContent = `${formatNumber(profile.followers)} followers`;
  refs.metaFollowing.textContent = `${formatNumber(profile.following)} following`;

  refs.railName.textContent = name;
  refs.railLogin.textContent = `@${profile.login}`;
  refs.railFollowers.textContent = formatNumber(profile.followers);
  refs.railFollowing.textContent = formatNumber(profile.following);
  refs.railProfileLink.href = profile.url;

  if (profile.createdAt) {
    const year = new Date(profile.createdAt).getFullYear();
    refs.metaSince.textContent = `joined ${year}`;
  }

  if (profile.location) {
    refs.metaLocation.textContent = profile.location;
    refs.metaLocation.hidden = false;
  }
}

function renderStats() {
  const repos = state.repos;
  const stars = repos.reduce((sum, repo) => sum + (repo.stars || 0), 0);
  const forks = repos.reduce((sum, repo) => sum + (repo.forks || 0), 0);

  refs.statRepos.textContent = formatNumber(repos.length);
  refs.statStars.textContent = formatNumber(stars);
  refs.statForks.textContent = formatNumber(forks);
  refs.statLanguages.textContent = formatNumber(languageTotals().length);
}

function renderFetchedAt() {
  if (!state.fetchedAt) return;
  const label = `อัปเดต ${dateFmt.format(new Date(state.fetchedAt))}`;
  refs.fetchedAt.textContent = label;
  refs.railFetched.textContent = label;
}

/* ---------- render: languages ---------- */

function languageTotals() {
  const bytes = new Map();
  let hasBytes = false;

  for (const repo of state.repos) {
    for (const lang of repo.languages || []) {
      if (!lang.size) continue;
      const entry = bytes.get(lang.name) || { value: 0, color: lang.color || languageColor(lang.name) };
      entry.value += lang.size;
      bytes.set(lang.name, entry);
      hasBytes = true;
    }
  }

  const source = new Map();
  if (hasBytes) {
    for (const [name, entry] of bytes) source.set(name, entry);
  } else {
    for (const repo of state.repos) {
      const name = repo.language?.name;
      if (!name) continue;
      const entry = source.get(name) || { value: 0, color: repo.language?.color || languageColor(name) };
      entry.value += 1;
      source.set(name, entry);
    }
  }

  return [...source.entries()]
    .map(([name, entry]) => ({ name, ...entry }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

function renderLanguages() {
  const entries = languageTotals();

  if (!entries.length) {
    refs.languageBreakdown.innerHTML = '<p class="rail-empty">ยังไม่มีข้อมูลภาษา</p>';
    return;
  }

  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const percent = (value) => {
    const pct = (value / total) * 100;
    return pct > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`;
  };
  const top = entries.slice(0, 4);
  const rest = entries.slice(4);
  const segments = top.map((entry) => ({ ...entry }));
  if (rest.length) {
    segments.push({
      name: 'อื่น ๆ',
      value: rest.reduce((sum, entry) => sum + entry.value, 0),
      color: 'var(--text-tertiary)',
    });
  }

  const bar = el(
    'div',
    { class: 'lang-bar', role: 'img', 'aria-label': 'สัดส่วนภาษาใน repository' },
    segments.map((segment) =>
      el('span', {
        style: `width:${((segment.value / total) * 100).toFixed(2)}%;--seg:${segment.color}`,
        title: `${segment.name} ${percent(segment.value)}`,
      })
    )
  );

  const legend = el(
    'ul',
    { class: 'lang-legend' },
    segments.map((segment) =>
      el(
        'li',
        { class: 'lang-row' },
        el('span', { class: 'lang-dot', style: `--dot:${segment.color}` }),
        el('span', { class: 'lang-name' }, segment.name),
        el('span', { class: 'lang-value' }, percent(segment.value))
      )
    )
  );

  refs.languageBreakdown.replaceChildren(bar, legend);
}

/* ---------- render: filters ---------- */

function renderFilters() {
  const counts = new Map();
  for (const repo of state.repos) {
    const name = repo.language?.name;
    if (!name) continue;
    const entry = counts.get(name) || { count: 0, color: repo.language?.color || languageColor(name) };
    entry.count += 1;
    counts.set(name, entry);
  }

  const entries = [...counts.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
  const chips = [
    el(
      'button',
      {
        class: 'chip',
        type: 'button',
        'aria-pressed': String(state.language === 'all'),
        dataset: { language: 'all' },
      },
      'ทั้งหมด',
      el('span', { class: 'chip__count' }, String(state.repos.length))
    ),
    ...entries.map(([name, info]) =>
      el(
        'button',
        {
          class: 'chip',
          type: 'button',
          'aria-pressed': String(state.language === name),
          dataset: { language: name },
        },
        el('span', { class: 'chip__dot', style: `--dot:${info.color}` }),
        name,
        el('span', { class: 'chip__count' }, String(info.count))
      )
    ),
  ];

  refs.filters.replaceChildren(...chips);
}

/* ---------- render: repos ---------- */

function visibleRepos() {
  const query = state.query.trim().toLowerCase();
  const repos = state.repos.filter((repo) => {
    if (state.language !== 'all' && repo.language?.name !== state.language) return false;
    if (!query) return true;
    return [repo.name, repo.description, repo.language?.name, ...(repo.topics || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  switch (state.sort) {
    case 'name':
      repos.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
      break;
    case 'stars':
      repos.sort((a, b) => (b.stars || 0) - (a.stars || 0) || a.name.localeCompare(b.name));
      break;
    case 'created':
      repos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    default:
      repos.sort((a, b) => new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0));
  }

  return repos;
}

function render() {
  state.loading = false;
  refs.cards.setAttribute('aria-busy', 'false');
  refs.cards.dataset.view = state.view;

  const hasRepos = state.repos.length > 0;
  refs.toolbar.hidden = !hasRepos;
  refs.filters.hidden = !hasRepos;

  if (!hasRepos) {
    refs.cards.innerHTML = '';
    refs.cards.hidden = true;
    refs.resultCount.textContent = '';
    refs.empty.hidden = false;
    refs.emptyTitle.textContent = 'ยังไม่มี repository';
    refs.emptyText.textContent = state.profile?.login
      ? state.source === 'static'
        ? `@${state.profile.login} ยังไม่มี repo public — GitHub Pages แสดงได้เฉพาะ repository แบบ public`
        : `@${state.profile.login} ยังไม่มี repo ที่แสดงได้ — ถ้า repo เป็น private ต้องล็อกอินบัญชีนี้ หรือตั้งค่า GITHUB_TOKEN`
      : 'ยังไม่มี repo ที่แสดงได้ในขณะนี้';
    refs.clearFilters.hidden = true;
    return;
  }

  refs.clearFilters.hidden = false;

  const repos = visibleRepos();
  const total = state.repos.length;

  refs.resultCount.textContent =
    repos.length === total ? `ทั้งหมด ${formatNumber(total)} repo` : `แสดง ${formatNumber(repos.length)} / ${formatNumber(total)} repo`;

  if (!repos.length) {
    refs.emptyTitle.textContent = 'ไม่พบ repo ที่ตรงกัน';
    refs.emptyText.textContent = 'ลองเปลี่ยนคำค้นหา หรือเลือกภาษาใหม่';
  }

  refs.empty.hidden = repos.length > 0;
  refs.cards.hidden = repos.length === 0;
  refs.cards.replaceChildren(...repos.map((repo, index) => repoCard(repo, index)));
}

function repoCard(repo, index) {
  const langColor = repo.language?.color || languageColor(repo.language?.name);
  const push = repo.pushedAt || repo.updatedAt;

  const badges = [];
  if (repo.isPrivate) badges.push(el('span', { class: 'badge badge--private', html: `${ICONS.lock}<span>ส่วนตัว</span>` }));
  if (repo.isFork) badges.push(el('span', { class: 'badge', html: `fork` }));
  if (repo.isArchived) badges.push(el('span', { class: 'badge', html: `${ICONS.archive}<span>archived</span>` }));

  const nameLink = el(
    'a',
    { class: 'repo-name', href: repo.url, target: '_blank', rel: 'noreferrer', title: `${repo.fullName} บน GitHub` },
    el('span', { html: ICONS.repo }),
    el('span', {}, repo.name),
    el('span', { html: ICONS.arrow })
  );

  const headingChildren = [nameLink];
  if (repo.homepage) {
    headingChildren.push(
      el(
        'a',
        {
          class: 'repo-home',
          href: repo.homepage,
          target: '_blank',
          rel: 'noreferrer',
          title: 'เปิดเว็บไซต์ของโปรเจกต์',
          'aria-label': `เปิดเว็บไซต์ของ ${repo.name}`,
          html: ICONS.globe,
        }
      )
    );
  }

  const card = el(
    'article',
    { class: 'repo-card', style: `--enter-delay:${Math.min(index, 12) * 30}ms` },
    el('div', { class: 'repo-card__top' }, el('div', { class: 'repo-heading' }, headingChildren), el('div', { class: 'badges' }, badges)),
    el('p', { class: `repo-desc${repo.description ? '' : ' is-empty'}` }, repo.description || 'ไม่มีคำอธิบาย'),
    (repo.topics || []).length
      ? el('ul', { class: 'topics' }, repo.topics.slice(0, 3).map((topic) => el('li', {}, `#${topic}`)))
      : null,
    repo.latestCommit?.message
      ? el(
          'p',
          { class: 'repo-commit' },
          el('span', { html: ICONS.commit }),
          el('span', {}, repo.latestCommit.message),
          el('time', { datetime: repo.latestCommit.date || '' }, timeAgo(repo.latestCommit.date))
        )
      : null,
    el(
      'div',
      { class: 'repo-foot' },
      repo.language
        ? el('span', { class: 'repo-lang' }, el('span', { class: 'repo-lang__dot', style: `--dot:${langColor}` }), repo.language.name)
        : el('span', { class: 'repo-lang' }, 'ไม่ระบุภาษา'),
      repo.stars
        ? el('span', { class: 'metric', title: `${repo.stars} ดาว` }, el('span', { html: ICONS.star }), formatNumber(repo.stars))
        : null,
      repo.forks ? el('span', { class: 'metric', title: `${repo.forks} fork` }, el('span', { html: ICONS.fork }), formatNumber(repo.forks)) : null,
      push ? el('time', { class: 'repo-updated', datetime: push, title: dateFmt.format(new Date(push)) }, `อัปเดต ${timeAgo(push)}`) : null
    )
  );

  return card;
}

function renderSkeletons() {
  refs.cards.hidden = false;
  refs.cards.replaceChildren(
    ...Array.from({ length: 6 }, () =>
      el(
        'article',
        { class: 'repo-card skeleton-card', 'aria-hidden': 'true' },
        el(
          'div',
          { class: 'repo-card__top' },
          el('div', { class: 'sk sk--title' }),
          el('div', { class: 'sk sk--badge' })
        ),
        el('div', { class: 'sk sk--line' }),
        el('div', { class: 'sk sk--line-short' }),
        el('div', { class: 'sk sk--box' }),
        el('div', { class: 'sk sk--foot' })
      )
    )
  );
}

/* ---------- events ---------- */

refs.search.addEventListener('input', () => {
  state.query = refs.search.value;
  render();
});

refs.search.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    refs.search.value = '';
    state.query = '';
    render();
    refs.search.blur();
  }
});

refs.sort.addEventListener('change', () => {
  state.sort = refs.sort.value;
  render();
});

refs.filters.addEventListener('click', (event) => {
  const chip = event.target.closest('.chip');
  if (!chip) return;
  state.language = chip.dataset.language;
  renderFilters();
  render();
  chip.focus();
});

refs.viewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.view = button.dataset.view;
    localStorage.setItem('repo-view', state.view);
    refs.viewButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    render();
  });
});

refs.refresh.addEventListener('click', () => load({ refresh: true }));
refs.retry.addEventListener('click', () => load({ refresh: true }));

refs.clearFilters.addEventListener('click', () => {
  state.query = '';
  state.language = 'all';
  refs.search.value = '';
  refs.sort.value = 'pushed';
  state.sort = 'pushed';
  renderFilters();
  render();
});

refs.themeToggle.addEventListener('click', () => {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  localStorage.setItem('theme', next);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
  if (refs.toolbar.hidden) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  event.preventDefault();
  refs.search.focus();
});

refs.viewButtons.forEach((button) => {
  button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
});
refs.sort.value = state.sort;
refs.cards.dataset.view = state.view;

if (refs.footerYear) refs.footerYear.textContent = String(new Date().getFullYear());

renderSkeletons();
load();
