import { ChatVertexAI } from "@langchain/google-vertexai";
import { buildVertexConfig } from "@/lib/vertex";
import { StateGraph, START, Annotation } from "@langchain/langgraph";

// --- Types ---

export interface ClarificationQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface ConversationTurn {
  type: "qa" | "plan_feedback";
  question?: string;
  answer?: string;
  feedback?: string;
}

export interface ScreenFlow {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface FontOption {
  id: string;
  name: string;
  googleFontName: string;
  category: string;
  reason: string;
}

export interface VibeOption {
  id: string;
  name: string;           // e.g., "Corporate & Professional"
  description: string;    // e.g., "Clean lines, trustworthy feel, executive aesthetic"
  keywords: string[];     // e.g., ["minimal", "corporate", "trustworthy"]
  emoji: string;          // e.g., "🎯"
}

export interface DesignSystemOptions {
  fonts: FontOption[];
  vibes: VibeOption[];
}

export interface DesignSystemSelection {
  font: FontOption;
  vibe: VibeOption;
}

// --- State ---

export const AgentState = Annotation.Root({
  userRequest: Annotation<string>(),
  conversationHistory: Annotation<ConversationTurn[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),
  currentQuestion: Annotation<ClarificationQuestion | null>({
    reducer: (_, y) => y,
    default: () => null,
  }),
  clarificationComplete: Annotation<boolean>({
    reducer: (_, y) => y,
    default: () => false,
  }),
  skipToPlanning: Annotation<boolean>({
    reducer: (_, y) => y,
    default: () => false,
  }),
  enrichedRequest: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  // Design System state
  designSystemOptions: Annotation<DesignSystemOptions | null>({
    reducer: (_, y) => y,
    default: () => null,
  }),
  selectedDesignSystem: Annotation<DesignSystemSelection | null>({
    reducer: (_, y) => y,
    default: () => null,
  }),
  designSystemComplete: Annotation<boolean>({
    reducer: (_, y) => y,
    default: () => false,
  }),
  designApproved: Annotation<boolean>({
    reducer: (_, y) => y,
    default: () => false,
  }),
  planFeedback: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  plannedScreens: Annotation<Array<{ id: string; name: string; description: string }>>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  plannedFlows: Annotation<ScreenFlow[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  currentScreenIndex: Annotation<number>({
    reducer: (_, y) => y,
    default: () => 0,
  }),
  referenceHtml: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  currentScreenHtml: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  generatedScreens: Annotation<Array<{ id: string; name: string; html: string }>>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

// --- Models ---

const llm = new ChatVertexAI({
  ...buildVertexConfig("gemini-3-flash-preview"),
  temperature: 1.0,
  maxOutputTokens: 65536,
});

// Create a tagged LLM instance for parallel screen generation
function createScreenLLM(screenId: string) {
  return new ChatVertexAI({
    ...buildVertexConfig("gemini-3-flash-preview"),
    temperature: 1.0,
    maxOutputTokens: 65536,
  }).withConfig({ tags: [`screen:${screenId}`] });
}

// --- LLM Helper (no timeout - wait for completion) ---

async function invokeLLM(prompt: string): Promise<string> {
  console.log("[LLM] Starting request...");

  try {
    const response = await llm.invoke(prompt);
    console.log("[LLM] Response received");
    return response.content as string;
  } catch (error) {
    console.error("[LLM] Error:", error);
    throw error;
  }
}

// --- Nodes ---

// Node 0: Clarifier (Conversational - one question at a time)
async function clarifierNode(state: typeof AgentState.State) {
  const { userRequest, conversationHistory, skipToPlanning, planFeedback, enrichedRequest, designApproved, designSystemComplete } = state;

  // Skip clarification if design system is already complete (user selected font/colors)
  if (designSystemComplete) {
    return {
      clarificationComplete: true,
      currentQuestion: null,
      enrichedRequest: enrichedRequest || userRequest,
    };
  }

  if (designApproved) {
    return {
      clarificationComplete: true,
      currentQuestion: null,
      enrichedRequest: enrichedRequest || userRequest,
    };
  }

  if (planFeedback && planFeedback.trim().length > 0) {
    return {
      clarificationComplete: true,
      currentQuestion: null,
      enrichedRequest: enrichedRequest || userRequest,
    };
  }

  if (skipToPlanning) {
    const historyForEnriched = conversationHistory
      .map(turn => {
        if (turn.type === "qa") {
          return `- ${turn.question}: ${turn.answer}`;
        }
        return `- Plan feedback: ${turn.feedback}`;
      })
      .join('\n');

    const enrichedRequest = conversationHistory.length > 0
      ? `${userRequest}\n\nUser clarifications:\n${historyForEnriched}`
      : userRequest;

    return {
      clarificationComplete: true,
      currentQuestion: null,
      enrichedRequest,
    };
  }

  const historyText = conversationHistory.length > 0
    ? conversationHistory.map(turn => {
      if (turn.type === "qa") {
        return `Q: ${turn.question}\nA: ${turn.answer}`;
      }
      return `[Plan Feedback]: ${turn.feedback}`;
    }).join('\n\n')
    : 'No previous questions yet.';

  const prompt = `You are a Product Discovery Expert helping to understand an app idea before designing it.

ORIGINAL USER REQUEST: "${userRequest}"

CONVERSATION SO FAR:
${historyText}

YOUR TASK:
1. Analyze what information you already have vs what's missing
2. Decide: Do you have ENOUGH information to design this app?

If you have enough info → set "ready": true
If you need more info → ask ONE focused question with 1-4 clickable options

RULES:
- Ask only ONE question at a time
- Make options specific and helpful, not generic
- Questions must be in the SAME LANGUAGE as the user's request
- After 3-4 questions, you should have enough info if not continue
- Each question should build on previous answers

FORMAT YOUR RESPONSE:

<thinking>
[Your analysis here: what you know, what's missing, why you're asking this question or why you're ready]
</thinking>

\`\`\`json
{
  "ready": false,
  "question": {
    "id": "q${conversationHistory.length + 1}",
    "question": "Your single question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"]
  }
}
\`\`\`

OR if ready to design:

<thinking>
[Your analysis here]
</thinking>

\`\`\`json
{
  "ready": true,
  "summary": "Brief summary of what you understood about the project"
}
\`\`\`
`;

  try {
    const content = await invokeLLM(prompt);

    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      if (parsed.ready) {
        const historyForEnriched = conversationHistory
          .map(turn => {
            if (turn.type === "qa") {
              return `- ${turn.question}: ${turn.answer}`;
            }
            return `- Plan feedback: ${turn.feedback}`;
          })
          .join('\n');

        const enrichedRequest = `${userRequest}\n\nUser clarifications:\n${historyForEnriched}\n\nSummary: ${parsed.summary || ''}`;

        return {
          clarificationComplete: true,
          currentQuestion: null,
          enrichedRequest,
        };
      } else {
        // Validate that the question has all required fields
        const question = parsed.question;
        if (question && question.question && question.question.trim().length > 0 && question.options && question.options.length > 0) {
          return {
            currentQuestion: {
              id: question.id || `q${conversationHistory.length + 1}`,
              question: question.question,
              options: question.options,
            },
            clarificationComplete: false,
          };
        } else {
          // Invalid question format, skip to ready
          console.warn("[Clarifier] Invalid question format, skipping to ready:", question);
          const historyForEnriched = conversationHistory
            .map(turn => {
              if (turn.type === "qa") {
                return `- ${turn.question}: ${turn.answer}`;
              }
              return `- Plan feedback: ${turn.feedback}`;
            })
            .join('\n');

          const enrichedRequest = conversationHistory.length > 0
            ? `${userRequest}\n\nUser clarifications:\n${historyForEnriched}`
            : userRequest;

          return {
            clarificationComplete: true,
            currentQuestion: null,
            enrichedRequest,
          };
        }
      }
    }
  } catch (e) {
    console.error("[Clarifier] Error:", e);
  }

  return {
    clarificationComplete: true,
    currentQuestion: null,
    enrichedRequest: userRequest,
  };
}

// Node: Design System Generator
async function designSystemNode(state: typeof AgentState.State) {
  const { userRequest, enrichedRequest, designSystemComplete, selectedDesignSystem, planFeedback, designApproved } = state;

  // Skip if already complete or if we're in plan feedback/design approved mode
  if (designSystemComplete || selectedDesignSystem || planFeedback || designApproved) {
    return {
      designSystemComplete: true,
    };
  }

  const requestToUse = enrichedRequest || userRequest;

  const prompt = `You are an expert UI/UX Designer specializing in Design Systems.

USER PROJECT: "${requestToUse}"

YOUR TASK: Generate design system options tailored to this specific project.

Based on the project's nature, target audience, and industry, suggest:

1. **FONTS**: 5 Google Fonts that would work perfectly for this type of application
   - Consider readability, personality, and professionalism
   - Mix of heading and body fonts where appropriate
   - Must be real Google Fonts names (exactly as they appear on fonts.google.com)

2. **VIBES**: 5 distinct mood/atmosphere options that match different interpretations of the project
   - Each vibe should represent a unique visual direction and feeling
   - Describe the mood, not specific colors - let the designer interpret creatively
   - Think: "Corporate & Trustworthy" vs "Playful & Vibrant" vs "Dark & Techy"

FORMAT YOUR RESPONSE:

<thinking>
[Analyze the project type, target users, industry standards, and what visual language would resonate best]
</thinking>

\`\`\`json
{
  "fonts": [
    {
      "id": "font_1",
      "name": "Display Name",
      "googleFontName": "Exact Google Font Name",
      "category": "Sans-serif|Serif|Display|Monospace",
      "reason": "Brief reason why this font fits the project"
    }
  ],
  "vibes": [
    {
      "id": "vibe_1",
      "name": "Vibe Name (e.g., 'Corporate & Professional', 'Playful & Vibrant')",
      "description": "Detailed description of the mood and atmosphere (e.g., 'Clean lines, trustworthy feel, executive aesthetic with subtle gradients')",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "emoji": "🎯"
    }
  ]
}
\`\`\`

IMPORTANT:
- Font names must be EXACTLY as they appear on Google Fonts (case-sensitive)
- Vibes should describe MOOD and ATMOSPHERE, not specific colors
- Each vibe should be genuinely different in feeling, not just variations
- Use appropriate emojis that match the vibe's mood
- Respond in the SAME LANGUAGE as the user's request (but keep keywords in English)
`;

  try {
    const content = await invokeLLM(prompt);

    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      return {
        designSystemOptions: {
          fonts: parsed.fonts || [],
          vibes: parsed.vibes || [],
        },
        designSystemComplete: false,
      };
    }
  } catch (e) {
    console.error("[DesignSystem] Error:", e);
  }

  // Fallback - skip design system selection
  return {
    designSystemComplete: true,
    designSystemOptions: null,
  };
}

// Node 1: Architecte (Thinking + Planning)
async function architectNode(state: typeof AgentState.State) {
  const { userRequest, enrichedRequest, planFeedback, plannedScreens: existingScreens, plannedFlows: existingFlows, designApproved, currentScreenIndex, generatedScreens } = state;
  const requestToUse = enrichedRequest || userRequest;

  const hasFeedback = planFeedback && planFeedback.trim().length > 0;
  const hasExistingPlan = existingScreens && existingScreens.length > 0;

  // Resume mode: preserve currentScreenIndex if screens already generated
  const isResumeMode = currentScreenIndex > 0 || (generatedScreens && generatedScreens.length > 0);

  if (designApproved && hasExistingPlan) {
    return {
      plannedScreens: existingScreens,
      plannedFlows: existingFlows || [],
      // CRITICAL: Preserve currentScreenIndex in resume mode to avoid regenerating first screen
      currentScreenIndex: isResumeMode ? currentScreenIndex : 0,
    };
  }

  let feedbackSection = "";
  if (hasFeedback && hasExistingPlan) {
    const existingPlanText = existingScreens.map(s => `- ${s.name}: ${s.description}`).join('\n');
    const existingFlowsText = existingFlows?.map(f => `- ${f.from} → ${f.to}: "${f.label}"`).join('\n') || '';
    feedbackSection = `
PREVIOUS PLAN:
${existingPlanText}

PREVIOUS FLOWS:
${existingFlowsText}

USER FEEDBACK ON THIS PLAN: "${planFeedback}"

**CRITICAL INSTRUCTION**: You MUST strictly follow the user's feedback.
- If the user asks for a specific number of screens (e.g., "only 2 screens", "just 3 screens"), you MUST return EXACTLY that number of screens. No more, no less.
- If the user mentions specific screen names to keep, ONLY keep those screens and remove all others.
- The user's explicit request takes priority over "completeness" - even if the app seems incomplete, respect the user's choice.
- Do NOT add extra screens "for completeness" or "for better UX" if the user didn't ask for them.
`;
  }

  const prompt = `You are an expert Product Architect & UX Lead.

User Request: "${requestToUse}"
${feedbackSection}
YOUR GOAL: Design a COMPLETE, PRODUCTION-READY WEB APPLICATION NOT MOBILE flow with navigation transitions.

Requirements:
1. **Focus on Core Screens** All the screens necessary for the app to be functional.
2. **Quality > Quantity**: Each screen must be essential to the user journey.
3. **Order**: FIRST screen = Main entry point (login, landing page, or main view).
4. **Navigation Flows**: Define forward transitions between screens (user journey from start to end).

Format your response:

<thinking>
[Brief analysis of user journey, screen selection, and navigation flows]
</thinking>

\`\`\`json
{
  "screens": [
    {
      "id": "screen_id_here",
      "name": "Screen Name",
      "description": "What this screen shows and its purpose, give as much detail as possible."
    }
  ],
  "flows": [
    {
      "id": "flow_1",
      "from": "source_screen_id",
      "to": "target_screen_id",
      "label": "Action description (e.g., 'Signs in', 'Views product', 'Adds to cart')"
    }
  ]
}
\`\`\`

IMPORTANT for flows - CREATE A STRICT TREE STRUCTURE:
- Include ONLY forward navigation paths (no backward flows like logout, back buttons)
- ONE screen can lead to MULTIPLE child screens (branching). Example: Dashboard can lead to both "Settings" AND "Profile"
- **CRITICAL: Each screen can only have ONE parent (one incoming flow). This is MANDATORY for proper visualization.**
- **NO convergent flows allowed** - two different screens CANNOT both point to the same destination screen.
- If multiple paths could logically lead to the same outcome, create separate screens (e.g., "Card Payment Success" and "PayPal Payment Success" instead of one shared "Payment Success")
- Screens at the same depth in the tree will be displayed vertically stacked
- Use short, action-oriented labels (e.g., "Signs in", "Views product", "Opens settings")
- Every screen must have at least one incoming or outgoing flow (except the root)

EXAMPLE VALID TREE STRUCTURE:
Landing → Auth → Dashboard
Dashboard → [Cart, Profile, Settings]
Cart → [Card Payment, PayPal Payment]
Card Payment → Card Success
PayPal Payment → PayPal Success

INVALID (causes visual overlap):
❌ Dashboard → Success AND Cart → Success (two parents for "Success")
❌ Login → Dashboard AND Signup → Dashboard (two parents for "Dashboard")

This creates a proper tree visualization where each node has exactly one parent.
`;

  let plannedScreens: Array<{ id: string; name: string; description: string }> = [];
  let plannedFlows: ScreenFlow[] = [];

  try {
    const content = await invokeLLM(prompt);
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      plannedScreens = parsed.screens || [];
      plannedFlows = parsed.flows || [];
    }
  } catch (e) {
    console.error("[Architect] Error:", e);
  }

  return {
    plannedScreens,
    plannedFlows,
    // CRITICAL: Preserve currentScreenIndex in resume mode
    currentScreenIndex: isResumeMode ? currentScreenIndex : 0,
  };
}

// Node 2: Designer (generates ONE screen at a time)
async function designerNode(state: typeof AgentState.State) {
  const { plannedScreens, userRequest, enrichedRequest, currentScreenIndex, referenceHtml, generatedScreens, selectedDesignSystem } = state;
  const requestToUse = enrichedRequest || userRequest;

  const screen = plannedScreens[currentScreenIndex];
  if (!screen) return { currentScreenHtml: "" };

  // Check if screen is already generated
  const existingScreen = generatedScreens.find(s => s.id === screen.id);
  if (existingScreen) {
    console.log(`[Designer] Skipping generation for ${screen.name} (already exists)`);
    return { currentScreenHtml: existingScreen.html };
  }

  const isFirstScreen = currentScreenIndex === 0;

  // Build design system instructions if user selected one
  let designSystemInstructions = '';
  if (selectedDesignSystem) {
    const { font, vibe } = selectedDesignSystem;

    // Check if user chose "auto" for vibe
    const vibeInstructions = vibe.id === 'auto'
      ? `- **Design Vibe**: You have complete creative freedom. Choose the best colors, gradients, and styling that fit the project's mood and purpose.`
      : `- **Design Vibe** "${vibe.name}" ${vibe.emoji}:
  Mood: ${vibe.description}
  Keywords: ${vibe.keywords.join(', ')}
  
  Interpret this vibe creatively - choose colors, gradients, and visual styling that embody this atmosphere. You have freedom in the specific colors, but the overall feel must match this vibe.`;

    designSystemInstructions = `
MANDATORY DESIGN SYSTEM (User Selected):
- **Font**: Use "${font.googleFontName}" from Google Fonts as the primary font family
${vibeInstructions}

You MUST apply this exact font throughout the design. Import the font from Google Fonts in the <head>.
`;
  }

  const basePrompt = `You are an elite UI/UX Designer creating production-ready interfaces.

USER REQUEST: "${requestToUse}"
SCREEN: ${screen.name}
DESCRIPTION: ${screen.description}
${designSystemInstructions}
DESIGN REQUIREMENTS:

Context-Adaptive Excellence: Create a highly polished, production-grade design that perfectly matches the specific nature of the request. Whether it is a game interface, a dashboard, or a landing page, automatically select the most appropriate layout, color palette, and typography to create a stunning visual experience.

Maximum Detail and Density: The interface must be densely populated and feature-rich. Do not produce simple wireframes or empty containers. Fill the space with intricate details, realistic content, background elements, and meaningful UI components that demonstrate a fully finished product.

Premium Visual Styling: Apply high-end design principles. Use sophisticated styling techniques such as nuanced lighting, shadows, gradients, borders, and textures to add depth and realism. The aesthetic should feel modern, professional, and visually captivating.

Comprehensive Interactivity: Design every element to look tangible and interactive. Include visual feedback for user actions, such as distinct hover states, focus rings, and active states. The interface should feel alive and responsive.

Robust Implementation: Ensure the design is structurally sound.

Functional Interactivity with Alpine.js:
You MUST make the interface functional using **Alpine.js** (v3).
- Use \`x-data\` to manage state and behavior directly within the HTML.
- Ensure all interactive elements respond appropriately to user input.
- Implement logical flows and state updates that match the application's purpose.
- Do not produce static artifacts; the UI must be playable/usable.

Flawless Mobile Responsiveness: The design must be fully adaptive and function perfectly on mobile devices. Ensure layouts transition smoothly from desktop to small screens, utilizing stackable grids, touch-friendly sizing, and optimized navigation to maintain high usability and visual impact across all viewports.

IMAGES - CRITICAL:
- NEVER use unvalid URLs (check them first)

LAYOUT - CRITICAL:
- The <body> MUST have "min-height: 100vh" to fill the entire viewport
- The page background color MUST cover the full height (no gaps at bottom)
- Use flexbox with flex-col on body and flex-grow on main content to push footer down`;

  let prompt: string;

  if (isFirstScreen) {
    prompt = `${basePrompt}

This is the MAIN REFERENCE SCREEN. It defines the design system for all other screens.

OUTPUT: Return a COMPLETE HTML document starting with <!DOCTYPE html>. Include:
- <head> with Tailwind CSS CDN, Alpine.js CDN, Google Fonts imports, and any custom <style>
- <body> with all your content
No markdown blocks, just raw HTML.`;
  } else {
    prompt = `${basePrompt}

REFERENCE DESIGN (Screen #1 - your design bible):
\`\`\`html
${referenceHtml}
\`\`\`

COPY THE VISUAL DNA - You MUST preserve:
1. **Color Palette**
2. **Typography**
3. **Spacing Patterns**
4. **Component Styles** - Buttons, cards, inputs, badges must look identical
5. **Icon Style** - Copy SVG icons exactly as they appear in the reference

Think of it like a website template: the "chrome" (navigation, branding, layout frame) stays the same, only the "page content" changes for "${screen.name}".

OUTPUT: Return a COMPLETE HTML document starting with <!DOCTYPE html>. Include:
- <head> with Tailwind CSS CDN, Alpine.js CDN, Google Fonts imports, and any custom <style>
- <body> with all your content
No markdown blocks, just raw HTML.`;
  }

  try {
    const content = await invokeLLM(prompt);
    let html = content
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();

    if (html.startsWith('"') && html.endsWith('"')) {
      html = html.slice(1, -1);
    }

    return { currentScreenHtml: html };
  } catch (e) {
    console.error("[Designer] Error:", e);
    return { currentScreenHtml: "" };
  }
}

// Node 3: Save first screen (design system) and set referenceHtml
async function saveScreenNode(state: typeof AgentState.State) {
  const { currentScreenHtml, plannedScreens, currentScreenIndex } = state;

  const screen = plannedScreens[currentScreenIndex];
  if (!screen) return {};

  return {
    generatedScreens: [{
      id: screen.id,
      name: screen.name,
      html: currentScreenHtml,
    }],
    referenceHtml: currentScreenHtml,
    currentScreenIndex: 1,
    currentScreenHtml: "",
  };
}

// Helper function to build the prompt for a screen
function buildScreenPrompt(
  screen: { id: string; name: string; description: string },
  referenceHtml: string,
  requestToUse: string,
  selectedDesignSystem?: DesignSystemSelection | null
): string {
  // Build design system instructions if user selected one
  let designSystemInstructions = '';
  if (selectedDesignSystem) {
    const { font, vibe } = selectedDesignSystem;

    // Check if user chose "auto" for vibe
    const vibeInstructions = vibe.id === 'auto'
      ? `- **Design Vibe**: You have complete creative freedom. Choose the best colors, gradients, and styling that fit the project's mood and purpose.`
      : `- **Design Vibe** "${vibe.name}" ${vibe.emoji}:
  Mood: ${vibe.description}
  Keywords: ${vibe.keywords.join(', ')}
  
  Interpret this vibe creatively - choose colors, gradients, and visual styling that embody this atmosphere. You have freedom in the specific colors, but the overall feel must match this vibe.`;

    designSystemInstructions = `
MANDATORY DESIGN SYSTEM (User Selected):
- **Font**: Use "${font.googleFontName}" from Google Fonts as the primary font family
${vibeInstructions}

You MUST apply this exact font throughout the design.
`;
  }

  return `You are an elite UI/UX Designer creating production-ready interfaces.

USER REQUEST: "${requestToUse}"
SCREEN: ${screen.name}
DESCRIPTION: ${screen.description}
${designSystemInstructions}
DESIGN REQUIREMENTS:

Context-Adaptive Excellence: Create a highly polished, production-grade design that perfectly matches the specific nature of the request. Whether it is a game interface, a dashboard, or a landing page, automatically select the most appropriate layout, color palette, and typography to create a stunning visual experience.

Maximum Detail and Density: The interface must be densely populated and feature-rich. Do not produce simple wireframes or empty containers. Fill the space with intricate details, realistic content, background elements, and meaningful UI components that demonstrate a fully finished product.

Premium Visual Styling: Apply high-end design principles. Use sophisticated styling techniques such as nuanced lighting, shadows, gradients, borders, and textures to add depth and realism. The aesthetic should feel modern, professional, and visually captivating.

Comprehensive Interactivity: Design every element to look tangible and interactive. Include visual feedback for user actions, such as distinct hover states, focus rings, and active states. The interface should feel alive and responsive.

Robust Implementation: Ensure the design is structurally sound.

Functional Interactivity with Alpine.js:
You MUST make the interface functional using **Alpine.js** (v3).
- Use \`x-data\` to manage state and behavior directly within the HTML.
- Ensure all interactive elements respond appropriately to user input.
- Implement logical flows and state updates that match the application's purpose.
- Do not produce static artifacts; the UI must be playable/usable.

Flawless Mobile Responsiveness: The design must be fully adaptive and function perfectly on mobile devices. Ensure layouts transition smoothly from desktop to small screens, utilizing stackable grids, touch-friendly sizing, and optimized navigation to maintain high usability and visual impact across all viewports.

IMAGES - CRITICAL:
- NEVER use unvalid URLs (check them first)

LAYOUT - CRITICAL:
- The <body> MUST have "min-height: 100vh" to fill the entire viewport
- The page background color MUST cover the full height (no gaps at bottom)
- Use flexbox with flex-col on body and flex-grow on main content to push footer down

REFERENCE DESIGN (Screen #1 - your design bible):
\`\`\`html
${referenceHtml}
\`\`\`

COPY THE VISUAL DNA - You MUST preserve:
1. **Color Palette**
2. **Typography**
3. **Spacing Patterns**
4. **Component Styles** - Buttons, cards, inputs, badges must look identical
5. **Icon Style** - Copy SVG icons exactly as they appear in the reference

Think of it like a website template: the "chrome" (navigation, branding, layout frame) stays the same, only the "page content" changes for "${screen.name}".

OUTPUT: Return a COMPLETE HTML document starting with <!DOCTYPE html>. Include:
- <head> with Tailwind CSS CDN, Alpine.js CDN, Google Fonts imports, and any custom <style>
- <body> with all your content
No markdown blocks, just raw HTML.`;
}

// Helper function to generate a single screen HTML with tagged LLM for streaming identification
async function generateScreenHtmlWithTag(
  screen: { id: string; name: string; description: string },
  referenceHtml: string,
  requestToUse: string,
  selectedDesignSystem?: DesignSystemSelection | null
): Promise<string> {
  const prompt = buildScreenPrompt(screen, referenceHtml, requestToUse, selectedDesignSystem);
  const taggedLLM = createScreenLLM(screen.id);

  try {
    console.log(`[generateScreenHtmlWithTag] Starting for screen: ${screen.id}, referenceHtml length: ${referenceHtml?.length || 0}`);

    const response = await taggedLLM.invoke(prompt);

    let html = (response.content as string)
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();

    if (html.startsWith('"') && html.endsWith('"')) {
      html = html.slice(1, -1);
    }

    // Validate HTML is complete
    if (!html.includes('</html>')) {
      console.warn(`[generateScreenHtmlWithTag] WARNING: Incomplete HTML for screen ${screen.id} - missing </html> tag`);
    }

    console.log(`[generateScreenHtmlWithTag] Completed for screen: ${screen.id}, html length: ${html.length}`);
    return html;
  } catch (e) {
    console.error("[generateScreenHtmlWithTag] Error for screen:", screen.id, e);
    return "";
  }
}

// Node 4: Parallel Designer - generates ALL remaining screens in parallel with streaming support
async function parallelDesignerNode(state: typeof AgentState.State) {
  const { plannedScreens, referenceHtml, userRequest, enrichedRequest, generatedScreens, selectedDesignSystem } = state;
  const requestToUse = enrichedRequest || userRequest;

  const remainingScreens = plannedScreens.slice(1).filter(screen =>
    !generatedScreens.some(generated => generated.id === screen.id)
  );

  if (remainingScreens.length === 0) {
    return { generatedScreens: [] };
  }

  console.log(`[ParallelDesigner] Starting parallel generation of ${remainingScreens.length} screens`);
  console.log(`[ParallelDesigner] referenceHtml available: ${!!referenceHtml}, length: ${referenceHtml?.length || 0}`);

  if (!referenceHtml || referenceHtml.length === 0) {
    console.error('[ParallelDesigner] ERROR: referenceHtml is empty! Design system will not be applied.');
  }

  // Use tagged LLM instances so streamEvents can identify which screen each chunk belongs to
  const results = await Promise.all(
    remainingScreens.map(async (screen) => {
      console.log(`[ParallelDesigner] Generating: ${screen.name} (${screen.id})`);
      const html = await generateScreenHtmlWithTag(screen, referenceHtml, requestToUse, selectedDesignSystem);
      console.log(`[ParallelDesigner] Completed: ${screen.name} (${screen.id})`);
      return {
        id: screen.id,
        name: screen.name,
        html,
      };
    })
  );

  console.log(`[ParallelDesigner] All ${remainingScreens.length} screens generated`);

  return {
    generatedScreens: results,
    currentScreenIndex: plannedScreens.length,
  };
}

// --- Conditional Edge Functions ---

function afterClarifier(state: typeof AgentState.State): "design_system" | "__end__" {
  const { clarificationComplete, planFeedback, designApproved, designSystemComplete } = state;

  // Skip to design_system if design system already complete (user selected font/colors)
  if (designSystemComplete) {
    return "design_system";
  }

  // Skip to design_system if plan feedback or design approved (they'll skip through)
  if (planFeedback && planFeedback.trim().length > 0) {
    return "design_system";
  }

  if (designApproved) {
    return "design_system";
  }

  if (clarificationComplete) {
    return "design_system";
  }
  return "__end__";
}

function afterDesignSystem(state: typeof AgentState.State): "architect" | "__end__" {
  const { designSystemComplete, designSystemOptions, planFeedback, designApproved } = state;

  // If plan feedback or design approved, skip to architect
  if (planFeedback && planFeedback.trim().length > 0) {
    return "architect";
  }

  if (designApproved) {
    return "architect";
  }

  // If design system options are generated but not yet selected, stop and wait for user
  if (designSystemOptions && !designSystemComplete) {
    return "__end__";
  }

  // If complete (user selected or skipped), continue to architect
  if (designSystemComplete) {
    return "architect";
  }

  return "__end__";
}

function afterArchitect(state: typeof AgentState.State): "designer" | "parallel_designer" | "__end__" {
  const { designApproved, currentScreenIndex, generatedScreens } = state;

  // Resume mode: If first screen already generated, skip designer and go to parallel_designer
  if (currentScreenIndex > 0 || (generatedScreens && generatedScreens.length > 0)) {
    console.log('[Graph] Resume mode detected - skipping to parallel_designer');
    return "parallel_designer";
  }

  if (designApproved) {
    return "designer";
  }
  return "__end__";
}

function afterSaveScreen(state: typeof AgentState.State): "parallel_designer" | "__end__" {
  const { plannedScreens } = state;

  if (plannedScreens.length > 1) {
    return "parallel_designer";
  }
  return "__end__";
}

// --- Graph Definition ---

const workflow = new StateGraph(AgentState)
  .addNode("clarifier", clarifierNode)
  .addNode("design_system", designSystemNode)
  .addNode("architect", architectNode)
  .addNode("designer", designerNode)
  .addNode("save_screen", saveScreenNode)
  .addNode("parallel_designer", parallelDesignerNode)
  .addEdge(START, "clarifier")
  .addConditionalEdges("clarifier", afterClarifier)
  .addConditionalEdges("design_system", afterDesignSystem)
  .addConditionalEdges("architect", afterArchitect)
  .addEdge("designer", "save_screen")
  .addConditionalEdges("save_screen", afterSaveScreen);

export const appGeneratorGraph = workflow.compile();
