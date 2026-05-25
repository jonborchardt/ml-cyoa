/**
 * exportStory.ts
 *
 * Export a MyStory in various formats:
 *   - ZIP of ChoiceScript .txt files + images/
 *   - JSON backup (full MyStory JSON)
 */

import type { MyStory } from './myStoryStore';
import { serializeStory } from './serializeStory';

// ─── Browser download helper ───────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── ZIP export ────────────────────────────────────────────────────────────

function base64ToUint8(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function strToU8(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

export async function exportAsZip(story: MyStory): Promise<Uint8Array> {
    const { zipSync } = await import('fflate');

    const sceneFiles = serializeStory(story);
    const entries: Record<string, Uint8Array> = {};

    // Scene text files
    for (const [sceneId, text] of sceneFiles) {
        entries[`${sceneId}.txt`] = strToU8(text);
    }

    // Image files
    for (const [filename, dataUrl] of Object.entries(story.images)) {
        const comma = dataUrl.indexOf(',');
        if (comma === -1) continue;
        const base64 = dataUrl.slice(comma + 1);
        entries[`images/${filename}`] = base64ToUint8(base64);
    }

    return zipSync(entries);
}

export async function downloadAsZip(story: MyStory): Promise<void> {
    const bytes = await exportAsZip(story);
    const slug = (story.title || 'story').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' }), `${slug}.zip`);
}

// ─── JSON backup ───────────────────────────────────────────────────────────

export function exportAsBackupJson(story: MyStory): string {
    return JSON.stringify(story, null, 2);
}

export function downloadAsBackupJson(story: MyStory): void {
    const slug = (story.title || 'story').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    downloadBlob(
        new Blob([exportAsBackupJson(story)], { type: 'application/json' }),
        `${slug}-backup.json`,
    );
}

// ─── Scene text copy ───────────────────────────────────────────────────────

export function getSceneText(story: MyStory, sceneId: string): string {
    const files = serializeStory(story);
    return files.get(sceneId) ?? '';
}
