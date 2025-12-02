import { appGeneratorGraph, ConversationTurn, ScreenFlow, DesignSystemOptions, DesignSystemSelection } from '@/ai/graph';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const runtime = 'nodejs';
export const maxDuration = 300;

interface RequestBody {
  prompt: string;
  conversationHistory?: ConversationTurn[];
  plannedScreens?: Array<{ id: string; name: string; description: string }>;
  plannedFlows?: ScreenFlow[];
  skipToPlanning?: boolean;
  designApproved?: boolean;
  planFeedback?: string;
  generatedScreens?: Array<{ id: string; name: string; html: string }>;
  mode?: 'generate' | 'chat';
  // Design System
  designSystemOptions?: DesignSystemOptions | null;
  selectedDesignSystem?: DesignSystemSelection | null;
  designSystemComplete?: boolean;
}

function sendSSE(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const payload = `data: ${JSON.stringify({ type: event, data })}\n\n`;
  controller.enqueue(new TextEncoder().encode(payload));
}

export async function POST(request: Request) {
  const body: RequestBody = await request.json();
  const { 
    prompt, 
    conversationHistory = [], 
    plannedScreens = [],
    plannedFlows = [],
    skipToPlanning = false,
    designApproved = false,
    planFeedback = '',
    generatedScreens = [],
    mode = 'generate',
    designSystemOptions = null,
    selectedDesignSystem = null,
    designSystemComplete = false,
  } = body;

  if (mode === 'chat') {
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-3-pro-preview",
      temperature: 0.7,
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
           // Send a thought event to show activity
           sendSSE(controller, 'thought', "Analyzing your question...");

           const contextScreens = plannedScreens.map(s => `${s.name}: ${s.description}`).join('\n');
           const contextFlows = plannedFlows.map(f => `${f.from} -> ${f.to} (${f.label})`).join('\n');
           
           let chatPrompt = `You are a helpful AI assistant aiding a user in designing an app.
The user has paused the generation process to ask a question or asked for clarification.
Answer concisely and helpfully.

Current App Plan:
${contextScreens}

Current Flows:
${contextFlows}`;

           chatPrompt += `\n\nUser Question: "${prompt}"`;

           const response = await llm.invoke(chatPrompt);
           
           sendSSE(controller, 'chat_response', response.content);
           sendSSE(controller, 'done', {});
           controller.close();
        } catch (e) {
           console.error("Chat mode error:", e);
           sendSSE(controller, 'error', { message: String(e) });
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

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const initialState = {
          userRequest: prompt,
          conversationHistory,
          plannedScreens,
          plannedFlows,
          skipToPlanning,
          designApproved,
          planFeedback,
          currentQuestion: null,
          clarificationComplete: false,
          enrichedRequest: '',
          currentScreenIndex: 0,
          referenceHtml: generatedScreens.length > 0 ? generatedScreens[0].html : '',
          currentScreenHtml: '',
          generatedScreens,
          // Design System
          designSystemOptions,
          selectedDesignSystem,
          designSystemComplete,
        };

        let lastNode = '';
        let screenIndex = 0;
        let planningStepSent = false;
        let currentNodeForThinking = '';
        
        // Thinking stream state
        let thinkingBuffer = '';
        let isInsideThinking = false;
        let thinkingEnded = false;

        // Use streamEvents to get LLM token streaming
        const eventStream = appGeneratorGraph.streamEvents(initialState, {
          version: 'v2',
        });

        // Track HTML streaming state for designer (first screen)
        let isStreamingHtml = false;
        let htmlBuffer = '';
        let currentDesignerScreenId = '';

        // Track HTML streaming state for parallel screens (multiple screens at once)
        const parallelHtmlBuffers: Map<string, { buffer: string; isStreaming: boolean }> = new Map();

        for await (const event of eventStream) {
          // Stream LLM tokens for thinking content OR designer HTML
          if (event.event === 'on_chat_model_stream') {
            const chunk = event.data?.chunk;
            if (chunk?.content && typeof chunk.content === 'string') {
              
              // Check if this chunk is from a tagged parallel screen LLM
              const tags = event.tags || [];
              const screenTag = tags.find((t: string) => t.startsWith('screen:'));
              
              if (screenTag && currentNodeForThinking === 'parallel_designer') {
                // Extract screenId from tag like "screen:screen_123"
                const screenId = screenTag.replace('screen:', '');
                
                // Initialize buffer for this screen if not exists
                if (!parallelHtmlBuffers.has(screenId)) {
                  parallelHtmlBuffers.set(screenId, { buffer: '', isStreaming: false });
                }
                
                const screenState = parallelHtmlBuffers.get(screenId)!;
                screenState.buffer += chunk.content;
                
                // Look for start of HTML (<!DOCTYPE or <html)
                if (!screenState.isStreaming) {
                  const doctypeIndex = screenState.buffer.indexOf('<!DOCTYPE');
                  const htmlIndex = screenState.buffer.indexOf('<html');
                  const startIndex = doctypeIndex >= 0 ? doctypeIndex : htmlIndex;
                  
                  if (startIndex >= 0) {
                    screenState.isStreaming = true;
                    const htmlContent = screenState.buffer.slice(startIndex);
                    if (htmlContent) {
                      sendSSE(controller, 'code_chunk', { 
                        screenId, 
                        content: htmlContent 
                      });
                    }
                    screenState.buffer = '';
                  }
                } else {
                  // Already streaming, send chunk directly
                  sendSSE(controller, 'code_chunk', { 
                    screenId, 
                    content: chunk.content 
                  });
                  screenState.buffer = '';
                }
              }
              // Stream HTML for designer node (first screen only)
              else if (currentNodeForThinking === 'designer' && currentDesignerScreenId) {
                htmlBuffer += chunk.content;
                
                // Look for start of HTML (<!DOCTYPE or <html)
                if (!isStreamingHtml) {
                  const doctypeIndex = htmlBuffer.indexOf('<!DOCTYPE');
                  const htmlIndex = htmlBuffer.indexOf('<html');
                  const startIndex = doctypeIndex >= 0 ? doctypeIndex : htmlIndex;
                  
                  if (startIndex >= 0) {
                    isStreamingHtml = true;
                    const htmlContent = htmlBuffer.slice(startIndex);
                    if (htmlContent) {
                      sendSSE(controller, 'code_chunk', { 
                        screenId: currentDesignerScreenId, 
                        content: htmlContent 
                      });
                    }
                    htmlBuffer = '';
                  }
                } else {
                  // Already streaming, send chunk directly
                  sendSSE(controller, 'code_chunk', { 
                    screenId: currentDesignerScreenId, 
                    content: chunk.content 
                  });
                }
              }
              // Stream thinking for clarifier, design_system, and architect nodes
              else if ((currentNodeForThinking === 'clarifier' || currentNodeForThinking === 'design_system' || currentNodeForThinking === 'architect') && !thinkingEnded) {
                thinkingBuffer += chunk.content;
                
                // Check if we're entering <thinking>
                if (!isInsideThinking && thinkingBuffer.includes('<thinking>')) {
                  isInsideThinking = true;
                  // Send content after <thinking> tag
                  const afterTag = thinkingBuffer.split('<thinking>')[1] || '';
                  if (afterTag && !afterTag.includes('</thinking>')) {
                    sendSSE(controller, 'thought', afterTag);
                  } else if (afterTag.includes('</thinking>')) {
                    // Thinking already ended in this chunk
                    const thinkingContent = afterTag.split('</thinking>')[0];
                    if (thinkingContent) {
                      sendSSE(controller, 'thought', thinkingContent);
                    }
                    thinkingEnded = true;
                    isInsideThinking = false;
                  }
                  thinkingBuffer = '';
                } else if (isInsideThinking) {
                  // Check if thinking is ending
                  if (chunk.content.includes('</thinking>')) {
                    const beforeEnd = chunk.content.split('</thinking>')[0];
                    if (beforeEnd) {
                      sendSSE(controller, 'thought', beforeEnd);
                    }
                    thinkingEnded = true;
                    isInsideThinking = false;
                  } else {
                    // Stream the content
                    sendSSE(controller, 'thought', chunk.content);
                  }
                }
              }
            }
          }

          // Track which node is currently executing
          if (event.event === 'on_chain_start' && event.name) {
            const nodeName = event.name;
            console.log('[SSE] on_chain_start:', nodeName);
            if (['clarifier', 'design_system', 'architect', 'designer', 'save_screen', 'parallel_designer'].includes(nodeName)) {
              currentNodeForThinking = nodeName;
              // Reset thinking state for new node
              thinkingBuffer = '';
              isInsideThinking = false;
              thinkingEnded = false;
              
              // For designer, set up the current screen and reset HTML streaming
              if (nodeName === 'designer') {
                const screens = plannedScreens.length > 0 ? plannedScreens : [];
                const currentScreen = screens[screenIndex];
                if (currentScreen) {
                  currentDesignerScreenId = currentScreen.id;
                  isStreamingHtml = false;
                  htmlBuffer = '';
                  console.log('[Designer] Starting design for screen:', currentScreen.id, currentScreen.name);
                  
                  // Send screen_start event
                  sendSSE(controller, 'screen_start', { screenId: currentScreen.id });
                  sendSSE(controller, 'step', { 
                    name: 'designing_screen', 
                    status: 'started',
                    screenName: currentScreen.name,
                    screenIndex,
                    totalScreens: screens.length
                  });
                }
              }
              
              // For parallel_designer, send event to show all remaining screen loaders
              if (nodeName === 'parallel_designer') {
                const screens = plannedScreens.length > 0 ? plannedScreens : [];
                const remainingScreens = screens.slice(1);
                console.log('[ParallelDesigner] Starting parallel generation of', remainingScreens.length, 'screens');
                
                // Send parallel_screens_start with all remaining screens
                sendSSE(controller, 'parallel_screens_start', { 
                  screens: remainingScreens.map((s, i) => ({
                    id: s.id,
                    name: s.name,
                    index: i + 1
                  }))
                });
              }
            }
          }
          
          // Log all chain_end events to debug
          if (event.event === 'on_chain_end') {
            const outputKeys = event.data?.output ? Object.keys(event.data.output) : [];
            console.log('[SSE] on_chain_end:', event.name, 'output keys:', outputKeys);
            if (outputKeys.includes('currentScreenHtml')) {
              const html = event.data?.output?.currentScreenHtml;
              console.log('[SSE] Found currentScreenHtml:', html ? `${String(html).length} chars` : 'EMPTY/NULL');
            }
          }

          // Handle node completion events
          if (event.event === 'on_chain_end') {
            const nodeName = event.name;
            const output = event.data?.output;

            if (!output || typeof output !== 'object') continue;

            const state = output as Record<string, unknown>;

            // Clarifier node
            if (nodeName === 'clarifier') {
              if (lastNode !== 'clarifier') {
                sendSSE(controller, 'step', { name: 'clarifying', status: 'started' });
                lastNode = 'clarifier';
              }

              if (state.currentQuestion) {
                sendSSE(controller, 'step', { name: 'clarifying', status: 'waiting' });
                sendSSE(controller, 'clarification_question', state.currentQuestion);
              } else if (state.clarificationComplete) {
                sendSSE(controller, 'step', { name: 'clarifying', status: 'completed' });
              }
            }

            // Design System node
            if (nodeName === 'design_system') {
              lastNode = 'design_system';
              
              // If options were generated, send them to the client
              if (state.designSystemOptions && !state.designSystemComplete) {
                sendSSE(controller, 'step', { name: 'design_system', status: 'waiting' });
                sendSSE(controller, 'design_system_options', state.designSystemOptions);
              } else if (state.designSystemComplete) {
                sendSSE(controller, 'step', { name: 'design_system', status: 'completed' });
                // Start planning step
                if (!planningStepSent) {
                  const isReplanning = planFeedback && planFeedback.trim().length > 0;
                  sendSSE(controller, 'step', { 
                    name: isReplanning ? 'replanning' : 'planning', 
                    status: 'started' 
                  });
                  planningStepSent = true;
                }
              }
            }

            // Architect node
            if (nodeName === 'architect') {
              lastNode = 'architect';

              if (state.plannedScreens && Array.isArray(state.plannedScreens)) {
                sendSSE(controller, 'plan', state.plannedScreens);
              }
              if (state.plannedFlows && Array.isArray(state.plannedFlows)) {
                sendSSE(controller, 'flows', state.plannedFlows);
              }

              if (state.plannedScreens && !designApproved) {
                sendSSE(controller, 'step', { name: 'planning', status: 'completed' });
                sendSSE(controller, 'plan_ready', { 
                  plannedScreens: state.plannedScreens,
                  plannedFlows: state.plannedFlows || []
                });
              }
            }

            // Designer node - HTML is now streamed in real-time via on_chat_model_stream
            if (nodeName === 'designer') {
              if (lastNode !== 'designer') {
                sendSSE(controller, 'step', { name: 'designing', status: 'started' });
                lastNode = 'designer';
              }
              // Clear designer screen id after completion
              currentDesignerScreenId = '';
              console.log('[Designer] Node completed');
            }

            // Save screen node (first screen only now)
            if (nodeName === 'save_screen') {
              const screens = plannedScreens.length > 0 ? plannedScreens : (state.plannedScreens as Array<{ id: string; name: string; description: string }>) || [];
              
              sendSSE(controller, 'screen_complete', { 
                screenId: screens[screenIndex]?.id,
                screenIndex 
              });
              
              screenIndex++;
              lastNode = 'save_screen';
            }

            // Parallel designer node - all remaining screens completed
            if (nodeName === 'parallel_designer') {
              const generatedScreens = state.generatedScreens as Array<{ id: string; name: string; html: string }> || [];
              console.log('[ParallelDesigner] Completed, generated', generatedScreens.length, 'screens');
              
              // HTML is already streamed via code_chunk events, just send completion notification
              sendSSE(controller, 'parallel_screens_complete', { 
                screens: generatedScreens.map(s => ({
                  id: s.id,
                  name: s.name
                  // HTML not included - already streamed
                }))
              });
              
              lastNode = 'parallel_designer';
            }
          }
        }

        sendSSE(controller, 'done', {});
        controller.close();

      } catch (error) {
        console.error('Graph execution error:', error);
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
