// OpenAI-compatible chat completion types and HTTP helper.

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: unknown;
  function: (input: unknown) => string | Promise<string>;
}

interface ToolFunction {
  name: string;
  description: string;
  parameters: unknown;
}

interface ToolRequest {
  type: "function";
  function: ToolFunction;
}

interface CompletionRequest {
  model: string;
  messages: Message[];
  tools?: ToolRequest[];
}

interface CompletionResponse {
  choices?: {
    message: {
      content: string;
      tool_calls?: ToolCall[];
    };
  }[];
  error?: { message: string };
}

/** Sends a chat completion request and returns the assistant's response. */
export async function sendCompletion(
  apiKey: string,
  model: string,
  baseUrl: string,
  timeoutSec: number,
  messages: Message[],
  tools: ToolDefinition[],
): Promise<string> {
  const toolRequests: ToolRequest[] = tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));

  const reqBody: CompletionRequest = {
    model,
    messages,
    tools: toolRequests,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutSec * 1000);
  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(reqBody),
      signal: controller.signal,
    });

    const body = await resp.text();

    if (!resp.ok) {
      throw new Error(`API error (${resp.status}): ${body}`);
    }

    const parsed: CompletionResponse = JSON.parse(body);

    if (parsed.error) {
      throw new Error(`API error: ${parsed.error.message}`);
    }

    const assistantMsg = parsed.choices?.[0]?.message;
    if (!assistantMsg) {
      throw new Error("no choices in response");
    }

    if (assistantMsg.tool_calls?.length) {
      const newMessages: Message[] = [
        ...messages,
        {
          role: "assistant",
          content: assistantMsg.content,
          tool_calls: assistantMsg.tool_calls,
        },
      ];

      for (const toolCall of assistantMsg.tool_calls) {
        const tool = tools.find((t) => t.name === toolCall.function.name);
        if (!tool) {
          throw new Error(`unknown tool: ${toolCall.function.name}`);
        }
        let result: string;
        try {
          result = await tool.function(JSON.parse(toolCall.function.arguments));
        } catch (err) {
          throw new Error(`tool ${tool.name} failed: ${String(err)}`);
        }
        newMessages.push({
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        });
      }

      return sendCompletion(
        apiKey,
        model,
        baseUrl,
        timeoutSec,
        newMessages,
        tools,
      );
    }

    return assistantMsg.content;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
