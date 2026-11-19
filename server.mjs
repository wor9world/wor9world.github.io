import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const LOGIN = process.env.GITHUB_USER || 'wor9world';
const CACHE_TTL = Number(process.env.CACHE_TTL_MS || 120_000);

let cache = null; // { data, at }

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const QUERY = `
query ($login: String!) {
  user(login: $login) {
    login
    name
    avatarUrl(size: 200)
    bio
    location
    websiteUrl
    url
    createdAt
    followers { totalCount }
    following { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
        name
        nameWithOwner
        description
        url
        homepageUrl
        isPrivate
        isFork
        isArchived
        isTemplate
        stargazerCount
        forkCount
        pushedAt
        createdAt
        updatedAt
        primaryLanguage { name color }
        repositoryTopics(first: 6) { nodes { topic { name } } }
        licenseInfo { spdxId }
        defaultBranchRef {
          target {
            ... on Commit { committedDate messageHeadline }
          }
        }
        languages(first: 5, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

function normalizeFromGraphQL(user) {
  return {
    profile: {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      websiteUrl: user.websiteUrl,
      url: user.url,
      createdAt: user.createdAt,
      followers: user.followers?.totalCount ?? 0,
      following: user.following?.totalCount ?? 0,
    },
    repos: (user.repositories?.nodes ?? []).map((repo) => ({
      name: repo.name,
      fullName: repo.nameWithOwner,
      description: repo.description,
      url: repo.url,
      homepage: repo.homepageUrl || null,
      isPrivate: repo.isPrivate,
      isFork: repo.isFork,
      isArchived: repo.isArchived,
      isTemplate: repo.isTemplate,
      stars: repo.stargazerCount ?? 0,
      forks: repo.forkCount ?? 0,
      pushedAt: repo.pushedAt,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
      language: repo.primaryLanguage
        ? { name: repo.primaryLanguage.name, color: repo.primaryLanguage.color }
        : null,
      topics: (repo.repositoryTopics?.nodes ?? []).map((n) => n.topic.name),
      license: repo.licenseInfo?.spdxId || null,
      latestCommit: repo.defaultBranchRef?.target
        ? {
            date: repo.defaultBranchRef.target.committedDate || null,
            message: repo.defaultBranchRef.target.messageHeadline || null,
          }
        : null,
      languages: (repo.languages?.edges ?? []).map((e) => ({
        name: e.node.name,
        color: e.node.color,
        size: e.size,
      })),
    })),
  };
}

function normalizeFromRest(user, repos) {
  return {
    profile: {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      location: user.location,
      websiteUrl: user.blog || null,
      url: user.html_url,
      createdAt: user.created_at,
      followers: user.followers ?? 0,
      following: user.following ?? 0,
    },
    repos: repos.map((repo) => ({
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
      topics: repo.topics ?? [],
      license: repo.license?.spdx_id || null,
      latestCommit: null,
      languages: [],
    })),
  };
}

async function fetchViaGh() {
  const { stdout } = await execFileAsync(
    'gh',
    ['api', 'graphql', '-f', `query=${QUERY}`, '-f', `login=${LOGIN}`],
    { maxBuffer: 20 * 1024 * 1024, windowsHide: true, timeout: 30_000 }
  );

  const payload = JSON.parse(stdout);
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join('; '));
  }
  if (!payload.data?.user) {
    throw new Error(`ไม่พบบัญชี GitHub "${LOGIN}"`);
  }
  return normalizeFromGraphQL(payload.data.user);
}

async function fetchViaToken() {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'content-type': 'application/json',
      'user-agent': 'github-home',
    },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `GitHub GraphQL ตอบกลับ ${response.status}`);
  }
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join('; '));
  }
  if (!payload.data?.user) {
    throw new Error(`ไม่พบบัญชี GitHub "${LOGIN}"`);
  }
  return normalizeFromGraphQL(payload.data.user);
}

async function fetchViaRest() {
  const headers = {
    'user-agent': 'github-home',
    accept: 'application/vnd.github+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const [userRes, repoRes] = await Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(LOGIN)}`, { headers }),
    fetch(
      `https://api.github.com/users/${encodeURIComponent(LOGIN)}/repos?per_page=100&sort=pushed&type=owner`,
      { headers }
    ),
  ]);

  if (!userRes.ok || !repoRes.ok) {
    const status = !userRes.ok ? userRes.status : repoRes.status;
    throw new Error(`GitHub API ตอบกลับ ${status} (ลองรัน "gh auth login" หรือตั้ง GITHUB_TOKEN)`);
  }

  return normalizeFromRest(await userRes.json(), await repoRes.json());
}

async function getData({ refresh = false } = {}) {
  if (!refresh && cache && Date.now() - cache.at < CACHE_TTL) {
    return cache.data;
  }

  const attempts = [];
  if (process.env.GITHUB_TOKEN) attempts.push(['GITHUB_TOKEN', fetchViaToken]);
  attempts.push(['gh CLI', fetchViaGh], ['REST API', fetchViaRest]);

  const failures = [];
  let data = null;

  for (const [label, attempt] of attempts) {
    try {
      data = await attempt();
      break;
    } catch (error) {
      failures.push(`${label}: ${error.message}`);
      console.warn(`[github] ${label} failed: ${error.message}`);
    }
  }

  if (!data) {
    throw new Error(failures.join(' | '));
  }

  data = { ...data, fetchedAt: new Date().toISOString() };
  cache = { data, at: Date.now() };
  return data;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(payload);
}

async function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const filePath = path.resolve(PUBLIC_DIR, relative);

  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/repos') {
    try {
      const refresh = url.searchParams.has('refresh');
      const data = await getData({ refresh });
      sendJson(res, 200, data);
    } catch (error) {
      console.error('[github]', error);
      sendJson(res, 502, {
        error: error.message,
        hint: 'ตรวจสอบว่า gh CLI ล็อกอินอยู่ (gh auth status) หรือตั้งค่า GITHUB_TOKEN',
      });
    }
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    sendJson(res, 404, { error: 'ไม่พบ API นี้' });
    return;
  }

  await serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`\n  GitHub home  ->  http://${HOST}:${PORT}\n  account: ${LOGIN}\n`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try: $env:PORT=4300; node server.mjs`);
  } else {
    console.error(error);
  }
  process.exit(1);
});
