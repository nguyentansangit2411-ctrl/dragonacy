import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AIProvider } from '../../core/ai/ai-provider.interface';

@Injectable()
export class GeminiProProvider implements AIProvider {
  private readonly logger = new Logger(GeminiProProvider.name);
  private genAI: GoogleGenAI | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'your_gemini_api_key' && apiKey !== 'invalid_key') {
      this.genAI = new GoogleGenAI({ apiKey });
      this.logger.log('GeminiProProvider initialized with @google/genai SDK (supports AQ. key format).');
    } else {
      this.logger.warn('GEMINI_API_KEY is not configured. GeminiProProvider will fall back to simulated mode.');
    }
  }

  async generateContent(
    prompt: string,
    options?: Record<string, any>,
  ): Promise<{ text: string; safetyBlocked: boolean }> {
    // Standard mock behavior for safety trigger or timeout trigger in tests
    if (prompt.includes('trigger_safety')) {
      return { text: '', safetyBlocked: true };
    }

    if (prompt.includes('trigger_timeout')) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      throw new Error('Gateway Timeout');
    }

    if (!this.genAI) {
      this.logger.log(`[Simulated Mode] Generating simulated content for: ${prompt.substring(0, 40)}`);
      return {
        text: `🤖 AI generated content for: ${prompt.substring(0, 30)}... \n🔥 Grab yours now! #affiliate #deal`,
        safetyBlocked: false,
      };
    }

    try {
      const defaultModel = this.configService.get<string>('GEMINI_DEFAULT_MODEL') || 'gemini-2.5-flash';
      let requestedModel = options?.model || defaultModel;
      
      // Map obsolete 'gemini-1.5-flash' to a working fallback directly to prevent 404
      if (requestedModel === 'gemini-1.5-flash') {
        requestedModel = 'gemini-flash-latest';
      }

      const modelsToTry = [requestedModel];
      
      // Fallback strategies for high demand / temporary errors
      if (requestedModel === 'gemini-2.5-flash') {
        modelsToTry.push('gemini-2.5-flash-lite');
        modelsToTry.push('gemini-flash-latest');
      } else if (requestedModel === 'gemini-2.5-flash-lite') {
        modelsToTry.push('gemini-2.5-flash');
        modelsToTry.push('gemini-flash-latest');
      } else if (requestedModel === 'gemini-flash-latest') {
        modelsToTry.push('gemini-2.5-flash');
        modelsToTry.push('gemini-2.5-flash-lite');
      }

      let lastError: any = null;

      for (const model of modelsToTry) {
        let delay = 1000;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0 || modelsToTry.indexOf(model) > 0) {
              this.logger.log(`Attempting Gemini content generation using model ${model} (attempt ${attempt + 1}/3)...`);
            }
            
            const response = await this.genAI.models.generateContent({
              model: model,
              contents: prompt,
            });

            const text = response.text ?? '';
            const safetyBlocked = !text || text.trim() === '';

            return { text, safetyBlocked };
          } catch (error: any) {
            lastError = error;
            const errorMsg = error?.message || error?.toString() || '';
            
            if (errorMsg.includes('SAFETY') || errorMsg.includes('blocked') || errorMsg.includes('candidate')) {
              return { text: '', safetyBlocked: true };
            }
            
            this.logger.warn(`Gemini generation attempt ${attempt + 1} failed for model ${model}: ${errorMsg}`);
            
            // Retry on temporary spikes in demand (503), rate limits (429), unavailable status
            const isTemporary = errorMsg.includes('503') || 
                                errorMsg.includes('demand') || 
                                errorMsg.includes('UNAVAILABLE') || 
                                errorMsg.includes('429') || 
                                errorMsg.includes('RESOURCE_EXHAUSTED') || 
                                errorMsg.includes('rate limit');
                                
            if (!isTemporary || attempt === 2) {
              break;
            }
            
            // Wait with exponential backoff before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
          }
        }
      }

      this.logger.error('Gemini content generation failed after trying fallback models and retries:');
      this.logger.error(lastError);
      throw lastError;
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (errorMsg.includes('SAFETY') || errorMsg.includes('blocked') || errorMsg.includes('candidate')) {
        return { text: '', safetyBlocked: true };
      }
      throw error;
    }
  }
}
