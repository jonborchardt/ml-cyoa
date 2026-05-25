import type { MyStory } from './myStoryStore';
import type { SceneDef } from './myStoryStore';
import { serializeFlow, serializeSubroutine } from './serializeFlow';

// Emits *title, *author, and (for multi-scene stories) *scene_list.
// *create/*temp are handled by serializeFlow when it receives the story param.
function buildStartupHeader(story: MyStory): string {
    const lines: string[] = [];
    lines.push(`*title ${story.title || 'My Story'}`);
    lines.push(`*author ${story.authorName || 'Author'}`);
    if (story.sceneOrder.length > 1) {
        lines.push('*scene_list');
        for (const id of story.sceneOrder) lines.push(`  ${id}`);
    }
    return lines.join('\n');
}

function serializeScene(scene: SceneDef, story: MyStory, isStartup: boolean): string {
    const body = serializeFlow(scene.nodes, scene.edges, isStartup ? story : undefined);
    const subroutineParts = (scene.subroutines ?? []).map(sub => serializeSubroutine(sub));

    let result = isStartup ? buildStartupHeader(story) + '\n' + body : body;
    if (subroutineParts.length > 0) {
        result += '\n\n' + subroutineParts.join('\n\n');
    }
    return result;
}

export function serializeStory(story: MyStory): Map<string, string> {
    const files = new Map<string, string>();

    // Emit scenes in sceneOrder; any scenes not in sceneOrder appended after
    const ordered = story.sceneOrder
        .map(id => story.scenes.find(s => s.id === id))
        .filter((s): s is SceneDef => s !== undefined);

    const orderedIds = new Set(story.sceneOrder);
    const extras = story.scenes.filter(s => !orderedIds.has(s.id));
    const allScenes = [...ordered, ...extras];

    allScenes.forEach((scene, idx) => {
        const isStartup = idx === 0;
        files.set(scene.id, serializeScene(scene, story, isStartup));
    });

    return files;
}
