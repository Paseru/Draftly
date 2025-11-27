import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
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

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3-pro-preview",
  temperature: 1.0,
  maxOutputTokens: 65536,
});

// --- LLM Helper with timeout ---

async function invokeLLM(prompt: string, timeoutMs = 60000): Promise<string> {
  console.log("[LLM] Starting request...");
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`LLM timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    const response = await Promise.race([
      llm.invoke(prompt),
      timeoutPromise
    ]);
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
  const { userRequest, conversationHistory, skipToPlanning, planFeedback, enrichedRequest, designApproved } = state;
  
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
        return {
          currentQuestion: parsed.question,
          clarificationComplete: false,
        };
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

// Node 1: Architecte (Thinking + Planning)
async function architectNode(state: typeof AgentState.State) {
  const { userRequest, enrichedRequest, planFeedback, plannedScreens: existingScreens, plannedFlows: existingFlows, designApproved } = state;
  const requestToUse = enrichedRequest || userRequest;
  
  const hasFeedback = planFeedback && planFeedback.trim().length > 0;
  const hasExistingPlan = existingScreens && existingScreens.length > 0;
  
  if (designApproved && hasExistingPlan) {
    return {
      plannedScreens: existingScreens,
      plannedFlows: existingFlows || [],
      currentScreenIndex: 0,
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

You must UPDATE the plan based on this feedback. Add, remove, or modify screens and flows as requested.
`;
  }
  
  const prompt = `You are an expert Product Architect & UX Lead.

User Request: "${requestToUse}"
${feedbackSection}
YOUR GOAL: Design a COMPLETE, PRODUCTION-READY WEB APPLICATION flow with navigation transitions.

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

IMPORTANT for flows - CREATE A TREE STRUCTURE:
- Include ONLY forward navigation paths (no backward flows like logout, back buttons)
- ONE screen can lead to MULTIPLE screens (branching). Example: Dashboard can lead to both "Settings" AND "Profile"
- Screens at the same depth in the tree will be displayed vertically stacked
- Use short, action-oriented labels (e.g., "Signs in", "Views product", "Opens settings")
- Every screen must have at least one incoming or outgoing flow

EXAMPLE TREE STRUCTURE:
Landing → Auth → [Dashboard, Admin Panel]
Dashboard → [Cart, Profile, Settings]
Cart → [Payment Success, Payment Failed]

This creates a proper tree visualization, NOT a linear chain.
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
    currentScreenIndex: 0,
  };
}

// Node 2: Designer (generates ONE screen at a time)
async function designerNode(state: typeof AgentState.State) {
  const { plannedScreens, userRequest, enrichedRequest, currentScreenIndex, referenceHtml } = state;
  const requestToUse = enrichedRequest || userRequest;
  
  const screen = plannedScreens[currentScreenIndex];
  if (!screen) return { currentScreenHtml: "" };
  
  const isFirstScreen = currentScreenIndex === 0;
  
  const basePrompt = `You are an elite UI/UX Designer creating production-ready interfaces.

USER REQUEST: "${requestToUse}"
SCREEN: ${screen.name}
DESCRIPTION: ${screen.description}

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
- NEVER use unvalid URLs (check them first)`;

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
    const content = await invokeLLM(prompt, 120000); // 2 min timeout for design
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

// Node 3: Save screen and advance
async function saveScreenNode(state: typeof AgentState.State) {
  const { currentScreenHtml, plannedScreens, currentScreenIndex, referenceHtml } = state;
  
  const screen = plannedScreens[currentScreenIndex];
  if (!screen) return {};
  
  const isFirstScreen = currentScreenIndex === 0;
  
  return {
    generatedScreens: [{
      id: screen.id,
      name: screen.name,
      html: currentScreenHtml,
    }],
    referenceHtml: isFirstScreen ? currentScreenHtml : referenceHtml,
    currentScreenIndex: currentScreenIndex + 1,
    currentScreenHtml: "",
  };
}

// --- Conditional Edge Functions ---

function afterClarifier(state: typeof AgentState.State): "architect" | "__end__" {
  const { clarificationComplete, planFeedback } = state;
  
  if (planFeedback && planFeedback.trim().length > 0) {
    return "architect";
  }
  
  if (clarificationComplete) {
    return "architect";
  }
  return "__end__";
}

function afterArchitect(state: typeof AgentState.State): "designer" | "__end__" {
  const { designApproved } = state;
  
  if (designApproved) {
    return "designer";
  }
  return "__end__";
}

function shouldContinueOrEnd(state: typeof AgentState.State): "designer" | "__end__" {
  const { currentScreenIndex, plannedScreens } = state;
  
  if (currentScreenIndex < plannedScreens.length) {
    return "designer";
  }
  return "__end__";
}

// --- Graph Definition ---

const workflow = new StateGraph(AgentState)
  .addNode("clarifier", clarifierNode)
  .addNode("architect", architectNode)
  .addNode("designer", designerNode)
  .addNode("save_screen", saveScreenNode)
  .addEdge(START, "clarifier")
  .addConditionalEdges("clarifier", afterClarifier)
  .addConditionalEdges("architect", afterArchitect)
  .addEdge("designer", "save_screen")
  .addConditionalEdges("save_screen", shouldContinueOrEnd);

export const appGeneratorGraph = workflow.compile();
