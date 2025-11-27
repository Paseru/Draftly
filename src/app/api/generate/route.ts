import { appGeneratorGraph, ConversationTurn, ScreenFlow } from '@/ai/graph';

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
    planFeedback = ''
  } = body;

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
          referenceHtml: '',
          currentScreenHtml: '',
          generatedScreens: [],
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

        // Track HTML streaming state for designer
        let isStreamingHtml = false;
        let htmlBuffer = '';
        let currentDesignerScreenId = '';

        for await (const event of eventStream) {
          // Stream LLM tokens for thinking content OR designer HTML
          if (event.event === 'on_chat_model_stream') {
            const chunk = event.data?.chunk;
            if (chunk?.content && typeof chunk.content === 'string') {
              
              // Stream HTML for designer node
              if (currentNodeForThinking === 'designer' && currentDesignerScreenId) {
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
              // Stream thinking for clarifier and architect nodes
              else if ((currentNodeForThinking === 'clarifier' || currentNodeForThinking === 'architect') && !thinkingEnded) {
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
            if (['clarifier', 'architect', 'designer', 'save_screen'].includes(nodeName)) {
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

            // Save screen node
            if (nodeName === 'save_screen') {
              const screens = plannedScreens.length > 0 ? plannedScreens : (state.plannedScreens as Array<{ id: string; name: string; description: string }>) || [];
              
              sendSSE(controller, 'screen_complete', { 
                screenId: screens[screenIndex]?.id,
                screenIndex 
              });
              
              screenIndex++;
              lastNode = 'save_screen';
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
