const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string | undefined;

export async function fileGitHubIssue(title: string, body: string): Promise<void> {
    if (!GITHUB_TOKEN) return;
    const res = await fetch('https://api.github.com/repos/jonborchardt/ml-cyoa/issues', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, body }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`GitHub ${res.status}: ${text}`);
    }
}
