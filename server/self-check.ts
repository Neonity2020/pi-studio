import assert from 'node:assert';
import {
  Agent,
  createReadTool,
  createBashTool,
} from '@earendil-works/pi-agent-core';
import {
  createAssistantMessageEventStream,
  type Model,
  type Api,
} from '@earendil-works/pi-ai';

console.log('--- Running Pi SDK Integration Self-Check ---');

const testModel: Model<Api> = {
  id: 'test-model',
  name: 'Test Model',
  api: 'openai-completions',
  provider: 'test',
};

let streamCalls = 0;
const streamFn = (model: Model<Api>, context: any) => {
  const stream = createAssistantMessageEventStream();
  streamCalls++;

  setTimeout(() => {
    if (streamCalls === 1) {
      // Step 1: Agent calls read tool
      const msg: any = {
        role: 'assistant',
        content: [
          {
            type: 'toolCall',
            id: 'tc_1',
            name: 'read',
            arguments: { path: 'package.json' },
          },
        ],
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage: { input: 10, output: 10, totalTokens: 20, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: 'tool_use',
        timestamp: Date.now(),
      };
      stream.push({ type: 'start', message: { ...msg, content: [] } });
      stream.push({ type: 'tool_call_start', contentIndex: 0, toolCall: msg.content[0] });
      stream.push({ type: 'tool_call_end', contentIndex: 0, toolCall: msg.content[0] });
      stream.push({ type: 'done', message: msg });
      stream.end();
    } else {
      // Step 2: Final response
      const msg: any = {
        role: 'assistant',
        content: [{ type: 'text', text: 'Pi Agent successfully executed tool!' }],
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage: { input: 20, output: 20, totalTokens: 40, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: 'stop',
        timestamp: Date.now(),
      };
      stream.push({ type: 'start', message: { ...msg, content: [] } });
      stream.push({ type: 'text_start', contentIndex: 0, text: '' });
      stream.push({ type: 'text_delta', contentIndex: 0, delta: msg.content[0].text });
      stream.push({ type: 'text_end', contentIndex: 0, text: msg.content[0].text });
      stream.push({ type: 'done', message: msg });
      stream.end();
    }
  }, 20);

  return stream;
};

const agent = new Agent({
  initialState: {
    systemPrompt: 'You are an autonomous Pi agent.',
    model: testModel,
    tools: [createReadTool(process.cwd())],
  },
  streamFn,
});

const receivedEvents: string[] = [];
agent.subscribe((event) => {
  receivedEvents.push(event.type);
});

await agent.prompt('Inspect project files');

console.log('Captured events:', receivedEvents);
assert.ok(receivedEvents.includes('agent_start'), 'Must emit agent_start');
assert.ok(receivedEvents.includes('tool_execution_start'), 'Must emit tool_execution_start');
assert.ok(receivedEvents.includes('tool_execution_end'), 'Must emit tool_execution_end');
assert.ok(receivedEvents.includes('agent_end'), 'Must emit agent_end');

assert.strictEqual(agent.state.messages.length, 4, 'Should contain 4 messages: user, assistant toolCall, toolResult, assistant final');
assert.strictEqual(agent.state.messages[0].role, 'user');
assert.strictEqual(agent.state.messages[1].role, 'assistant');
assert.strictEqual(agent.state.messages[2].role, 'toolResult');
assert.strictEqual(agent.state.messages[3].role, 'assistant');

console.log('Self-Check: ALL ASSERTIONS PASSED!');
