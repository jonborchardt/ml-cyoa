/**
 * importChoiceScript.ts
 *
 * Converts a map of ChoiceScript scene text files into a MyStory.
 * This is the import counterpart to serializeStory().
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from './parseGameFlow';
import { parseScene } from './parseChoiceScript';
import type { MyStory, SceneDef } from './myStoryStore';
import { migrateStory } from './myStoryStore';
import type { VariableDef, Achievement, StatEntry } from './types';

// ─── Startup-header extractors ─────────────────────────────────────────────

function extractTitle(text: string): string {
    const m = text.match(/^\*title\s+(.+)/m);
    return m ? m[1].trim() : '';
}

function extractAuthor(text: string): string {
    const m = text.match(/^\*author\s+(.+)/m);
    return m ? m[1].trim() : '';
}

function extractIfid(text: string): string | undefined {
    const m = text.match(/^\*ifid\s+(\S+)/m);
    return m ? m[1].trim() : undefined;
}

function extractSceneList(text: string): string[] {
    const m = text.match(/^\*scene_list[ \t]*\n((?:[ \t]+\S+[ \t]*\n)+)/m);
    if (!m) return [];
    return m[1].split('\n')
        .map(l => l.trim())
        .filter(Boolean);
}

function parseInitialValue(raw: string): string | number | boolean {
    const s = raw.trim();
    if (s === 'true') return true;
    if (s === 'false') return false;
    const n = Number(s);
    if (!Number.isNaN(n)) return n;
    // Quoted string → strip quotes
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
    }
    return s;
}

function extractVariables(text: string): VariableDef[] {
    const vars: VariableDef[] = [];
    // *create_array name length value
    const arrRe = /^\*create_array\s+(\w+)\s+(\d+)\s+(.*)/gm;
    let m: RegExpExecArray | null;
    while ((m = arrRe.exec(text)) !== null) {
        const name = m[1].toLowerCase();
        const length = parseInt(m[2], 10);
        const val = parseInitialValue(m[3]);
        const type: VariableDef['type'] =
            typeof val === 'boolean' ? 'boolean' :
            typeof val === 'number'  ? 'number'  : 'text';
        vars.push({ name, type, initialValue: val, scope: 'global', isArray: true, arrayLength: length });
    }
    // *create name value (non-array; *create_array won't match because it lacks a space after "create")
    const re = /^\*create\s+(\w+)\s+(.*)/gm;
    while ((m = re.exec(text)) !== null) {
        const name = m[1].toLowerCase();
        const val = parseInitialValue(m[2]);
        const type: VariableDef['type'] =
            typeof val === 'boolean' ? 'boolean' :
            typeof val === 'number'  ? 'number'  : 'text';
        vars.push({ name, type, initialValue: val, scope: 'global' });
    }
    return vars;
}

/**
 * Parses *achievement blocks. Format:
 *   *achievement <id> <visible|hidden> <points> <title>
 *     <pre_earned_description>
 *     [post_earned_description]
 */
function extractAchievements(text: string): Achievement[] {
    const achs: Achievement[] = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^\*achievement\s+(\w+)\s+(visible|hidden)\s+(\d+)\s+(.+)/);
        if (!m) continue;
        const [, id, vis, pts, title] = m;
        const points = parseInt(pts, 10);
        const isVisible = vis === 'visible';
        const bodyLines: string[] = [];
        let j = i + 1;
        while (j < lines.length && /^\s+\S/.test(lines[j])) {
            bodyLines.push(lines[j].trim());
            j++;
        }
        const [shortDescription = '', postDescription] = bodyLines;
        achs.push({ id, title: title.trim(), points, isVisible, shortDescription, postDescription });
    }
    return achs;
}

/**
 * Parses *stat_chart block. Format:
 *   *stat_chart
 *     percent score Score
 *     opposed_pair courage Courage timid Timid
 *     text player_name Name
 *     ...
 */
function extractStatChart(text: string): StatEntry[] {
    const entries: StatEntry[] = [];
    const m = text.match(/^\*stat_chart\s*\n((?:[ \t]+\S[^\n]*\n?)+)/m);
    if (!m) return entries;
    const body = m[1];
    for (const rawLine of body.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;
        const parts = line.split(/\s+/);
        const kind = parts[0] as StatEntry['kind'];
        if (kind === 'percent') {
            entries.push({ kind, variable: parts[1], label: parts.slice(2).join(' ') || parts[1] });
        } else if (kind === 'opposed_pair') {
            entries.push({ kind, variable: parts[1], label: parts[2] || parts[1], variable2: parts[3], label2: parts[4] || parts[3] });
        } else if (kind === 'text') {
            entries.push({ kind, variable: parts[1], label: parts.slice(2).join(' ') || parts[1] });
        }
    }
    return entries;
}

// ─── Scene name helpers ────────────────────────────────────────────────────

function toDisplayName(id: string): string {
    return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Main import function ───────────────────────────────────────────────────

/**
 * Convert a map of scene-id → raw ChoiceScript text into a new MyStory.
 * The map should use scene IDs as keys (without .txt extension).
 */
export function importFromChoiceScript(files: Map<string, string>): MyStory {
    const startupText = files.get('startup') ?? [...files.values()][0] ?? '';

    const title = extractTitle(startupText);
    const authorName = extractAuthor(startupText);
    const variables = extractVariables(startupText);
    const achievements = extractAchievements(startupText);
    const statChart = extractStatChart(startupText);
    const listedOrder = extractSceneList(startupText);
    const ifid = extractIfid(startupText);

    // Scene order: prefer *scene_list order, fallback to file insertion order
    const fileIds = [...files.keys()];
    const sceneOrder = listedOrder.length > 0
        ? listedOrder.filter(id => files.has(id))
        : fileIds;

    function parseSceneFile(id: string): SceneDef {
        const text = files.get(id) ?? '';
        const result = parseScene(text);
        const globalReuseMode = /^\*hide_reuse\b/m.test(text) ? 'hide'
            : /^\*disable_reuse\b/m.test(text) ? 'disable'
            : undefined;
        return {
            id,
            name: toDisplayName(id),
            nodes: result.nodes as Node<NodeData>[],
            edges: result.edges as Edge[],
            subroutines: [],
            ...(globalReuseMode ? { globalReuseMode } : {}),
        };
    }

    // Build SceneDef for each file
    const scenes: SceneDef[] = sceneOrder.map(parseSceneFile);

    // Any files not in sceneOrder (shouldn't happen, but be safe)
    const orderedSet = new Set(sceneOrder);
    for (const id of fileIds) {
        if (!orderedSet.has(id)) scenes.push(parseSceneFile(id));
    }

    const now = Date.now();
    return {
        id: crypto.randomUUID(),
        title: title || 'Imported Story',
        authorName: authorName || '',
        scenes,
        sceneOrder: sceneOrder.length > 0 ? sceneOrder : scenes.map(s => s.id),
        images: {},
        variables,
        statChart,
        achievements,
        ifid,
        createdAt: now,
        updatedAt: now,
    };
}

// ─── ZIP import ─────────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}

export async function importFromZip(bytes: Uint8Array): Promise<MyStory> {
    const { unzipSync, strFromU8 } = await import('fflate');
    const unzipped = unzipSync(bytes);
    const files = new Map<string, string>();
    const images: Record<string, string> = {};

    for (const [path, data] of Object.entries(unzipped)) {
        if (path.endsWith('.txt')) {
            const sceneId = path.replace(/\.txt$/, '').replace(/^.*\//, '');
            files.set(sceneId, strFromU8(data));
        } else if (/^images\//i.test(path)) {
            const filename = path.replace(/^images\//i, '');
            const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase();
            const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
            images[filename] = `data:${mime};base64,${uint8ToBase64(data)}`;
        }
    }

    const story = importFromChoiceScript(files);
    story.images = images;
    return story;
}

// ─── JSON backup import ─────────────────────────────────────────────────────

export function importFromBackupJson(json: string): MyStory {
    const parsed = JSON.parse(json) as unknown;
    return migrateStory(parsed);
}
