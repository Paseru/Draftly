import { ChatVertexAI } from "@langchain/google-vertexai";
import { buildVertexConfig } from "@/lib/vertex";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

export const runtime = 'nodejs';
export const maxDuration = 60;

interface SelectedElement {
  id?: string;
  cssSelector: string;
  html?: string;
}

interface RequestBody {
  screenId: string;
  currentHtml: string;
  userRequest: string;
  projectContext?: string;
  selectedElement?: SelectedElement;
}

function sendSSE(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const payload = `data: ${JSON.stringify({ type: event, data })}\n\n`;
  controller.enqueue(new TextEncoder().encode(payload));
}

const PATCH_SYSTEM_PROMPT = `Tu es un expert en modification de code HTML/CSS/JS. Tu travailles sur des designs web modernes utilisant Tailwind CSS et Alpine.js.

OBJECTIF: Analyser le HTML fourni et generer des patches JSON pour modifier UNIQUEMENT les parties necessaires.

FORMAT DE REPONSE OBLIGATOIRE:
\`\`\`json
{
  "patches": [
    {
      "action": "replace",
      "selector": "button.cta-primary",
      "newHtml": "<button class=\\"cta-primary bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg\\">Click Me</button>"
    }
  ],
  "explanation": "Explication breve des modifications effectuees"
}
\`\`\`

ACTIONS DISPONIBLES:
- "replace": Remplace un element par un nouveau (necessite selector + newHtml)
- "insertAfter": Insere du HTML apres l'element comme sibling (necessite selector + newHtml)
- "insertBefore": Insere du HTML avant l'element comme sibling (necessite selector + newHtml)
- "appendChild": Insere du HTML comme DERNIER ENFANT d'un conteneur (necessite selector + newHtml) - INTELLIGENT: insere automatiquement AVANT les elements fixed/sticky (bottom bars, footers fixes)
- "prependChild": Insere du HTML comme PREMIER ENFANT d'un conteneur (necessite selector + newHtml) - INTELLIGENT: insere automatiquement APRES les headers fixes
- "delete": Supprime l'element (necessite selector uniquement)
- "setAttribute": Modifie un attribut (necessite selector + attribute + value)

REGLES CRITIQUES:
1. **Selecteurs CSS precis**: Utilise des selecteurs CSS valides et specifiques (class, id, tag[attribut], combinaisons)
2. **Modifications minimales**: Ne modifie QUE ce qui est demande par l'utilisateur
3. **Preservation du contexte**: Garde le style Tailwind, les classes existantes, et la structure
4. **HTML complet**: Le newHtml doit contenir les balises ouvrantes ET fermantes completes
5. **Un patch par modification**: Separe les modifications independantes en plusieurs patches
6. **Ordre logique**: Les patches sont appliques dans l'ordre (important pour insertAfter/insertBefore)

REGLES D'INSERTION - UTILISE appendChild (TRES IMPORTANT):
Pour ajouter de nouvelles sections/composants, utilise "appendChild" sur le CONTENEUR DE CONTENU:
1. **Identifie le conteneur de contenu scrollable**: main, [class*="content"], [class*="overflow"], div avec flex-1, ou body
2. **appendChild est intelligent**: Il insere automatiquement AVANT les elements fixes (bottom-bar, footer fixe, nav fixe en bas)
3. **Ne PAS utiliser insertAfter sur le dernier element visible** - ca risque d'inserer apres des elements fixes

EXEMPLES D'UTILISATION:
- Ajouter section contact dans une landing: { "action": "appendChild", "selector": "main", "newHtml": "<section>...</section>" }
- Ajouter section dans un dashboard: { "action": "appendChild", "selector": "[class*='content']", "newHtml": "<div>...</div>" }
- Ajouter section dans une app mobile: { "action": "appendChild", "selector": "body", "newHtml": "<section>...</section>" }
- Ajouter card dans une grille: { "action": "appendChild", "selector": ".grid", "newHtml": "<div class='card'>...</div>" }
- Ajouter item dans une liste: { "action": "appendChild", "selector": "ul", "newHtml": "<li>...</li>" }

EXEMPLES DE SELECTEURS:
- "button.primary" - Bouton avec classe primary
- "#main-title" - Element avec id main-title
- "nav > ul > li:first-child" - Premier li dans le nav
- "section.hero" - Section avec classe hero
- "[data-component='header']" - Element avec attribut data-component
- "footer, [class*='footer'], nav[class*='bottom']" - Selecteur multiple pour trouver le footer

IMPORTANT:
- Ne regenere JAMAIS le HTML complet de la page
- Si la modification est impossible ou ambigue, retourne un tableau patches vide avec une explication
- Reponds UNIQUEMENT avec le bloc JSON, pas de texte avant ou apres`;

export async function POST(request: Request) {
  // Verify authentication
  const token = await convexAuthNextjsToken();
  if (!token) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body: RequestBody = await request.json();
  const { screenId, currentHtml, userRequest, projectContext, selectedElement } = body;

  if (!screenId || !currentHtml || !userRequest) {
    return new Response(JSON.stringify({ error: "Missing required fields: screenId, currentHtml, userRequest" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const llm = new ChatVertexAI({
    ...buildVertexConfig("gemini-2.0-flash"),
    temperature: 0.2, // Low temperature for more deterministic patches
    maxOutputTokens: 8192,
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendSSE(controller, 'thinking', "Analyzing your edit request...");

        // Build the user prompt with context
        const elementContext = selectedElement ? `
ELEMENT CIBLE (a modifier):
- Selecteur CSS suggere: ${selectedElement.cssSelector}
${selectedElement.html ? `- HTML de l'element:
\`\`\`html
${selectedElement.html}
\`\`\`
` : ''}
INSTRUCTIONS POUR CIBLER CET ELEMENT:
1. Analyse le HTML de l'element fourni ci-dessus
2. Trouve le MEILLEUR selecteur CSS pour le cibler dans le HTML complet de la page
3. Le selecteur suggere peut etre utilise comme point de depart, mais tu peux en trouver un meilleur/plus simple
4. Prefere les selecteurs simples: ID > classe unique > tag + classe
5. Evite les selecteurs trop longs avec beaucoup de ">"
` : '';

        const userPrompt = `HTML ACTUEL DE L'ECRAN:
\`\`\`html
${currentHtml}
\`\`\`
${elementContext}
${projectContext ? `CONTEXTE DU PROJET: ${projectContext}\n` : ''}
DEMANDE DE L'UTILISATEUR: "${userRequest}"

Genere les patches JSON pour effectuer cette modification. Assure-toi que les selecteurs CSS sont precis et ciblent exactement les bons elements.`;

        console.log('[EditScreen] Processing request:', { screenId, requestLength: userRequest.length, htmlLength: currentHtml.length });

        const response = await llm.invoke([
          { role: 'system', content: PATCH_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]);

        const content = response.content as string;
        console.log('[EditScreen] LLM response length:', content.length);

        // Extract JSON from response (handles markdown code blocks)
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                         content.match(/```\n([\s\S]*?)\n```/) ||
                         content.match(/\{[\s\S]*"patches"[\s\S]*\}/);

        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          try {
            const patchResponse = JSON.parse(jsonStr);

            // Validate the response structure
            if (!patchResponse.patches || !Array.isArray(patchResponse.patches)) {
              sendSSE(controller, 'error', {
                message: 'Invalid patch response: missing patches array',
                raw: content.substring(0, 500)
              });
            } else {
              console.log('[EditScreen] Parsed patches:', patchResponse.patches.length);
              sendSSE(controller, 'patches', patchResponse);
            }
          } catch (parseError) {
            console.error('[EditScreen] JSON parse error:', parseError);
            sendSSE(controller, 'error', {
              message: 'Failed to parse patch JSON',
              raw: jsonStr.substring(0, 500)
            });
          }
        } else {
          console.error('[EditScreen] No JSON found in response');
          sendSSE(controller, 'error', {
            message: 'No valid JSON found in LLM response',
            raw: content.substring(0, 500)
          });
        }

        sendSSE(controller, 'done', {});
        controller.close();
      } catch (error) {
        console.error('[EditScreen] Error:', error);
        sendSSE(controller, 'error', { message: String(error) });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
