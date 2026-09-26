import type {
  AIProvider,
  ProviderExecutionResult,
  ProviderStructuredRequest,
} from './ai-provider';

export class GeminiDirectBrowserProvider implements AIProvider {
  public readonly providerName = 'gemini-direct';
  public readonly modelName: string;
  private readonly apiKey: string;

  constructor(options?: { apiKey?: string; modelName?: string }) {
    this.apiKey = options?.apiKey ?? '';
    this.modelName = options?.modelName ?? 'gemini-2.5-flash';
  }

  public async healthCheck() {
    if (!this.apiKey) {
      return {
        available: false,
        provider: this.providerName,
        model: this.modelName,
        mode: 'browser-direct',
        reason: 'Direct client-side Gemini API key is not configured; server-side Edge Function provider recommended.',
      };
    }
    return {
      available: true,
      provider: this.providerName,
      model: this.modelName,
      mode: 'browser-direct',
    };
  }

  public async generateStructured(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult> {
    if (!this.apiKey) {
      throw new Error('PROVIDER_UNAVAILABLE: Client-side Gemini API Key is missing.');
    }

    const startMs = Date.now();
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.modelName)}:generateContent`;

    const promptText = [
      `Operation Type: ${request.operationType}`,
      `Authorized Journey Context:\n${request.boundedContextSummary.slice(0, 6000)}`,
      `Grounded Authoritative Facts:\n${JSON.stringify((request.groundedFacts || []).slice(0, 25))}`,
      `User Message:\n${request.sanitizedUserMessage.slice(0, 1500)}`,
      'Respond strictly with a JSON object matching schemaVersion "1.0", intent, responseType, confidence (0..1), requiresDeterministicValidation (true), headline, and message.'
    ].join('\n\n');

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: request.systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`PROVIDER_UNAVAILABLE: Gemini Direct API returned HTTP ${response.status}.`);
    }

    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let payload = {};
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = { error: 'Failed to parse JSON', rawText };
    }

    const latencyMs = Date.now() - startMs;

    return {
      providerName: this.providerName,
      modelName: this.modelName,
      rawOutput: payload as Record<string, unknown>,
      estimatedInputTokens: Math.ceil((request.sanitizedUserMessage.length + request.boundedContextSummary.length) / 4),
      estimatedOutputTokens: Math.ceil(JSON.stringify(payload).length / 4),
      latencyMs,
    };
  }

  public async generateExplanation(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult> {
    return this.generateStructured(request);
  }

  public async generateAssistantResponse(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult> {
    return this.generateStructured(request);
  }
}
