import { mkdir, writeFile } from 'node:fs/promises';

const owner = 'usman611b';
const repo = 'ai-engineer-journey';
const branch = 'main';
const apiHeaders = { 'User-Agent': 'usmanalii-portfolio-journal-builder' };

const representativePaths = {
  1: 'python-for-ai/day-01/session01_basics.py',
  2: 'python-for-ai/day-02/session01-functions.py',
  3: 'python-for-ai/day-03/session01-Lists.py',
  4: 'python-for-ai/day-04/student_managment_system.py',
  5: 'python-for-ai/day-05/student-mang-sys.py',
  6: 'python-for-ai/day-06/session02-Class-object.py',
  7: 'python-for-ai/day-07/session03-Polymorphisms.py',
  8: 'python-for-ai/day-08/OOP-Practice.py',
  9: 'python-for-ai/day-09/session03-Iterators_&_Generators.py',
  10: 'python-for-ai/day-10/session01-Modules.py',
  11: 'python-for-ai/day-11/session02-practice-numpy.py',
  12: 'python-for-ai/day-12/session05_Numpy_Linear_Algebra.py',
  13: 'math-for-ai/day-13/session10-Gram-Schmidt Process.py',
  14: 'math-for-ai/day-14/session03-practice_Build_a_2layer_neuron_network.py',
  15: 'math-for-ai/day-15/session08-Eigenvector&vales.py',
  16: 'math-for-ai/day-16/session06_Optimizer.py',
  17: 'math-for-ai/day-17/session03-backpropgation.py',
  18: 'math-for-ai/day-18/session09-Autodef_from_scratch.py',
  19: 'math-for-ai/day-19/session13-Cross_Entropy.py',
  20: 'math-for-ai/day-20/session17-Bayesian_AB_Testing_in_Python.py',
  21: 'math-for-ai/day-21/session17-Compare_GD_Momentum_and_Adam.py',
};

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function readJson(url) {
  return readWithRetry(url, (response) => response.json());
}

async function readText(url) {
  return readWithRetry(url, (response) => response.text());
}

async function readWithRetry(url, consume) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: apiHeaders });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
      return await consume(response);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

const tree = await readJson(
  `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
);

const rows = [];
for (const [dayText, path] of Object.entries(representativePaths)) {
  const day = Number(dayText);
  const prefix =
    day <= 12 ? `python-for-ai/day-${String(day).padStart(2, '0')}/` : `math-for-ai/day-${day}/`;
  const dayFiles = tree.tree
    .filter(
      (entry) =>
        entry.type === 'blob' &&
        entry.path.startsWith(prefix) &&
        !entry.path.includes('/.venv/') &&
        !entry.path.includes('/__pycache__/') &&
        !entry.path.endsWith('.pyc'),
    )
    .map((entry) => ({ path: entry.path, size: entry.size ?? 0 }));
  const [source, commits] = await Promise.all([
    readText(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodePath(path)}`),
    readJson(
      `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(prefix)}&per_page=100`,
    ),
  ]);
  const newest = commits[0];
  const oldest = commits.at(-1);
  rows.push({
    day,
    folder: prefix.slice(0, -1),
    folderUrl: `https://github.com/${owner}/${repo}/tree/${branch}/${prefix.slice(0, -1)}`,
    representativePath: path,
    representativeUrl: `https://github.com/${owner}/${repo}/blob/${branch}/${encodePath(path)}`,
    source,
    files: dayFiles,
    fileCount: dayFiles.length,
    sourceLineCount: source.split(/\r?\n/).length,
    commitCount: commits.length,
    newestCommit: newest
      ? {
          sha: newest.sha,
          url: newest.html_url,
          message: newest.commit.message.split('\n')[0],
          date: newest.commit.author.date,
        }
      : null,
    oldestCommit: oldest
      ? {
          sha: oldest.sha,
          url: oldest.html_url,
          message: oldest.commit.message.split('\n')[0],
          date: oldest.commit.author.date,
        }
      : null,
  });
}

await mkdir('.wrangler', { recursive: true });
await writeFile(
  '.wrangler/ai-journey-sources.json',
  JSON.stringify(
    {
      repository: `https://github.com/${owner}/${repo}`,
      branch,
      capturedAt: new Date().toISOString(),
      days: rows.sort((a, b) => a.day - b.day),
    },
    null,
    2,
  ),
  'utf8',
);

console.log(
  rows
    .sort((a, b) => a.day - b.day)
    .map(
      (row) =>
        `Day ${String(row.day).padStart(2, '0')}: ${row.fileCount} authored files, ${row.commitCount} commits, ${row.representativePath}`,
    )
    .join('\n'),
);
