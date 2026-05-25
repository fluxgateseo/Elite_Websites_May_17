export type GhCreateRepoArgs = {
  token: string;
  owner: string;
  name: string;
  privateRepo?: boolean;
  description?: string;
  fetcher?: typeof fetch;
};

export type GhCreateFromTemplateArgs = {
  token: string;
  templateOwner: string;
  templateRepo: string;
  newOwner?: string; // empty = authenticated user
  newName: string;
  privateRepo?: boolean;
  description?: string;
  fetcher?: typeof fetch;
};

export async function createRepoFromTemplate(args: GhCreateFromTemplateArgs): Promise<GhRepoInfo> {
  const fetcher = args.fetcher ?? fetch;
  const headers = {
    Authorization: `Bearer ${args.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "elite-pipeline-workflow",
  };
  const res = await fetcher(`https://api.github.com/repos/${args.templateOwner}/${args.templateRepo}/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      owner: args.newOwner || undefined,
      name: args.newName,
      private: args.privateRepo ?? true,
      description: args.description,
      include_all_branches: false,
    }),
  });
  if (res.ok) {
    const json = (await res.json()) as { full_name: string; html_url: string; default_branch: string };
    return { fullName: json.full_name, htmlUrl: json.html_url, defaultBranch: json.default_branch };
  }
  const body = await res.text();

  // 422 "Name already exists on this account" → reuse it (idempotent retry).
  // The overlay-commit step will still update content on top.
  if (res.status === 422 && /already exists/i.test(body)) {
    const owner = args.newOwner || (await whoami(args.token, fetcher));
    const lookupRes = await fetcher(`https://api.github.com/repos/${owner}/${args.newName}`, { headers });
    if (lookupRes.ok) {
      const j = (await lookupRes.json()) as { full_name: string; html_url: string; default_branch: string };
      return { fullName: j.full_name, htmlUrl: j.html_url, defaultBranch: j.default_branch };
    }
  }

  throw new Error(`GitHub createFromTemplate ${res.status}: ${body.slice(0, 500)}`);
}

async function whoami(token: string, fetcher: typeof fetch): Promise<string> {
  const res = await fetcher("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "elite-pipeline-workflow",
    },
  });
  if (!res.ok) throw new Error(`GitHub /user ${res.status}`);
  const j = (await res.json()) as { login: string };
  return j.login;
}

export type GhRepoInfo = {
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
};

export async function createRepo(args: GhCreateRepoArgs): Promise<GhRepoInfo> {
  const fetcher = args.fetcher ?? fetch;
  // Owner-aware: if the owner matches the token's user, use /user/repos. Otherwise /orgs/{owner}/repos.
  // Default to /user/repos and let GitHub redirect/error if owner mismatch.
  const url = `https://api.github.com/user/repos`;
  const res = await fetcher(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "elite-pipeline-workflow",
    },
    body: JSON.stringify({
      name: args.name,
      private: args.privateRepo ?? true,
      description: args.description,
      auto_init: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub createRepo ${res.status}: ${body.slice(0, 500)}`);
  }
  const json = (await res.json()) as { full_name: string; html_url: string; default_branch: string };
  return { fullName: json.full_name, htmlUrl: json.html_url, defaultBranch: json.default_branch };
}

export type GhCommitFile = { path: string; content: string; encoding?: "utf-8" | "base64" };

export type GhCommitArgs = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  message: string;
  files: GhCommitFile[];
  fetcher?: typeof fetch;
};

export async function commitFiles(args: GhCommitArgs): Promise<{ commitSha: string }> {
  const fetcher = args.fetcher ?? fetch;
  const headers = {
    Authorization: `Bearer ${args.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "elite-pipeline-workflow",
  };

  // Get current branch ref
  const refRes = await fetcher(
    `https://api.github.com/repos/${args.owner}/${args.repo}/git/ref/heads/${args.branch}`,
    { headers },
  );
  if (!refRes.ok) {
    throw new Error(`GitHub get ref ${refRes.status}: ${(await refRes.text()).slice(0, 500)}`);
  }
  const refJson = (await refRes.json()) as { object: { sha: string } };
  const baseSha = refJson.object.sha;

  // Get base tree from the commit at baseSha
  const commitRes = await fetcher(
    `https://api.github.com/repos/${args.owner}/${args.repo}/git/commits/${baseSha}`,
    { headers },
  );
  if (!commitRes.ok) {
    throw new Error(`GitHub get commit ${commitRes.status}: ${(await commitRes.text()).slice(0, 500)}`);
  }
  const commitJson = (await commitRes.json()) as { tree: { sha: string } };
  const baseTreeSha = commitJson.tree.sha;

  // Create blobs in parallel
  const blobs = await Promise.all(
    args.files.map(async (f) => {
      const blobRes = await fetcher(
        `https://api.github.com/repos/${args.owner}/${args.repo}/git/blobs`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            content: f.encoding === "base64" ? f.content : f.content,
            encoding: f.encoding ?? "utf-8",
          }),
        },
      );
      if (!blobRes.ok) {
        throw new Error(`GitHub blob ${blobRes.status} for ${f.path}`);
      }
      const blobJson = (await blobRes.json()) as { sha: string };
      return { path: f.path, sha: blobJson.sha };
    }),
  );

  // Create tree
  const treeRes = await fetcher(
    `https://api.github.com/repos/${args.owner}/${args.repo}/git/trees`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: blobs.map((b) => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha })),
      }),
    },
  );
  if (!treeRes.ok) {
    throw new Error(`GitHub tree ${treeRes.status}: ${(await treeRes.text()).slice(0, 500)}`);
  }
  const treeJson = (await treeRes.json()) as { sha: string };

  // Create commit
  const newCommitRes = await fetcher(
    `https://api.github.com/repos/${args.owner}/${args.repo}/git/commits`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: args.message,
        tree: treeJson.sha,
        parents: [baseSha],
      }),
    },
  );
  if (!newCommitRes.ok) {
    throw new Error(`GitHub new commit ${newCommitRes.status}: ${(await newCommitRes.text()).slice(0, 500)}`);
  }
  const newCommitJson = (await newCommitRes.json()) as { sha: string };

  // Update ref
  const updRes = await fetcher(
    `https://api.github.com/repos/${args.owner}/${args.repo}/git/refs/heads/${args.branch}`,
    {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ sha: newCommitJson.sha, force: false }),
    },
  );
  if (!updRes.ok) {
    throw new Error(`GitHub update ref ${updRes.status}: ${(await updRes.text()).slice(0, 500)}`);
  }
  return { commitSha: newCommitJson.sha };
}

export async function fetchTemplateRepoFiles(args: { token: string; owner: string; repo: string; ref?: string; fetcher?: typeof fetch }): Promise<{ path: string; content: string; encoding: "utf-8" | "base64" }[]> {
  const fetcher = args.fetcher ?? fetch;
  const headers = {
    Authorization: `Bearer ${args.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "elite-pipeline-workflow",
  };
  const refQuery = args.ref ? `?ref=${encodeURIComponent(args.ref)}` : "";
  // Get tree recursively
  const refRes = await fetcher(
    `https://api.github.com/repos/${args.owner}/${args.repo}/git/refs/heads/${args.ref ?? "main"}`,
    { headers },
  );
  if (!refRes.ok) {
    throw new Error(`GitHub fetch ref ${refRes.status}`);
  }
  const refJson = (await refRes.json()) as { object: { sha: string } };
  const treeRes = await fetcher(
    `https://api.github.com/repos/${args.owner}/${args.repo}/git/trees/${refJson.object.sha}?recursive=1`,
    { headers },
  );
  if (!treeRes.ok) {
    throw new Error(`GitHub fetch tree ${treeRes.status}`);
  }
  const treeJson = (await treeRes.json()) as { tree: { path: string; type: string; sha: string }[] };
  const files = treeJson.tree.filter((t) => t.type === "blob");
  // Fetch each blob
  const out: { path: string; content: string; encoding: "utf-8" | "base64" }[] = [];
  for (const f of files) {
    const blobRes = await fetcher(
      `https://api.github.com/repos/${args.owner}/${args.repo}/git/blobs/${f.sha}`,
      { headers },
    );
    if (!blobRes.ok) continue;
    const blobJson = (await blobRes.json()) as { content: string; encoding: "base64" | "utf-8" };
    out.push({ path: f.path, content: blobJson.content, encoding: blobJson.encoding });
  }
  return out;
}

const GH_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "elite-pipeline-workflow",
});

export async function getLatestWorkflowRun(args: { token: string; owner: string; repo: string; branch?: string; fetcher?: typeof fetch }): Promise<
  { id: number; status: string | null; conclusion: string | null; htmlUrl: string; name: string } | null
> {
  const fetcher = args.fetcher ?? fetch;
  const branch = args.branch ?? "main";
  const res = await fetcher(
    `https://api.github.com/repos/${args.owner}/${args.repo}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=1`,
    { headers: GH_HEADERS(args.token) },
  );
  if (!res.ok) throw new Error(`GitHub runs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as {
    workflow_runs?: { id: number; status: string | null; conclusion: string | null; html_url: string; name: string }[];
  };
  const run = json.workflow_runs?.[0];
  return run ? { id: run.id, status: run.status, conclusion: run.conclusion, htmlUrl: run.html_url, name: run.name } : null;
}

export async function rerunWorkflowRun(args: { token: string; owner: string; repo: string; runId: number; fetcher?: typeof fetch }): Promise<void> {
  const fetcher = args.fetcher ?? fetch;
  const res = await fetcher(
    `https://api.github.com/repos/${args.owner}/${args.repo}/actions/runs/${args.runId}/rerun`,
    { method: "POST", headers: GH_HEADERS(args.token) },
  );
  if (!res.ok && res.status !== 201) {
    throw new Error(`GitHub rerun ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
