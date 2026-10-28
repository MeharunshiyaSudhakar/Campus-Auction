require('dotenv').config();

class AiService {
  /**
   * Category-based fallback questions and helpful detail suggestions
   */
  static getCategorySuggestions(category) {
    const suggestionsMap = {
      cycle: [
        'Does the cycle display fading or squeaking on hard braking?',
        'Are both tyres holding air pressure without slow leaks?',
        'Is a cycle lock, bell, or frame pump included in the sale?',
      ],
      vehicles: [
        'Does the cycle display fading or squeaking on hard braking?',
        'Are both tyres holding air pressure without slow leaks?',
        'Is a cycle lock, bell, or frame pump included in the sale?',
      ],
      calculator: [
        'Does the LCD display screen show all numbers clearly with no fading digits?',
        'Is the original protective sliding hard cover included?',
        'Has the backup battery or solar panel been tested recently?',
      ],
      stationery: [
        'Does the LCD display screen show all numbers clearly with no fading digits?',
        'Is the original protective sliding hard cover included?',
        'Has the backup battery or solar panel been tested recently?',
      ],
      books: [
        'Are any important problem sets or formula summaries highlighted in ink?',
        'Is the book spine and binding intact with all pages present?',
        'Does it include syllabus question bank inserts or lab notes?',
      ],
      electronics: [
        'Is the original power brick and charging cable included?',
        'How many hours of battery life does it hold on typical student use?',
        'Are all USB/HDMI ports and display pixels fully working?',
      ],
      furniture: [
        'Can this item be disassembled easily to fit through hostel doors/elevators?',
        'Are all joints and screws firm with zero wobble?',
      ],
      clothing: [
        'Has this item shrunk or faded from laundry washing?',
        'Are all zippers, buttons, and seams fully intact?',
      ],
      sports: [
        'Has the racquet grip or ball pressure been recently refreshed?',
        'Is a protective carry cover or kit bag included?',
      ],
      other: [
        'Are all original cables, accessories, or manual sheets included?',
        'Are there any minor cosmetic marks or scuffs to disclose?',
      ],
    };

    return suggestionsMap[category?.toLowerCase()] || suggestionsMap.other;
  }

  /**
   * Safe, deterministic template description generator
   */
  static buildTemplateDescription(answers) {
    const lines = [];
    lines.push(`**${answers.title || 'Campus Item'}**`);
    lines.push(`• **Condition Grade**: ${answers.conditionGrade || 'Good'}`);
    lines.push(`• **Duration of Use**: ${answers.ageOfItem || 'Used during campus semesters'}`);
    lines.push(`• **Working Status**: ${answers.workingStatus || 'Fully functional'}`);

    if (answers.defects && answers.defects.trim().toLowerCase() !== 'none') {
      lines.push(`• **Disclosed Defects & Wear**: ${answers.defects.trim()}`);
    } else {
      lines.push(`• **Disclosed Defects**: None reported by seller`);
    }

    if (answers.accessories && answers.accessories.trim()) {
      lines.push(`• **Included Accessories**: ${answers.accessories.trim()}`);
    }

    // Category-specific details
    const cat = (answers.category || '').toLowerCase();
    if (cat === 'cycle' || cat === 'vehicles') {
      if (answers.cycle_gears) lines.push(`• **Gears**: ${answers.cycle_gears}`);
      if (answers.cycle_brakes) lines.push(`• **Brakes**: ${answers.cycle_brakes}`);
      if (answers.cycle_tyres) lines.push(`• **Tyres**: ${answers.cycle_tyres}`);
      if (answers.cycle_lastServiced) lines.push(`• **Last Serviced**: ${answers.cycle_lastServiced}`);
    } else if (cat === 'calculator' || cat === 'stationery') {
      if (answers.calculator_model) lines.push(`• **Model**: ${answers.calculator_model}`);
      if (answers.calculator_display) lines.push(`• **Display**: ${answers.calculator_display}`);
      if (answers.calculator_battery) lines.push(`• **Battery**: ${answers.calculator_battery}`);
    } else if (cat === 'books') {
      if (answers.books_edition) lines.push(`• **Edition**: ${answers.books_edition}`);
      if (answers.books_markedPages) lines.push(`• **Annotations**: ${answers.books_markedPages}`);
      if (answers.books_missingPages) lines.push(`• **Binding / Pages**: ${answers.books_missingPages}`);
    } else if (cat === 'electronics') {
      if (answers.electronics_warranty) lines.push(`• **Warranty**: ${answers.electronics_warranty}`);
      if (answers.electronics_charger) lines.push(`• **Charger**: ${answers.electronics_charger}`);
      if (answers.electronics_batteryHealth) lines.push(`• **Battery Health**: ${answers.electronics_batteryHealth}`);
    }

    if (answers.sellerDescription && answers.sellerDescription.trim()) {
      lines.push(`\n**Seller Notes**: ${answers.sellerDescription.trim()}`);
    }

    return lines.join('\n');
  }

  /**
   * Helper to execute a single call to Groq
   */
  static async callGroq(messages, groqKey, model) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'No response body');
        // Log status and message ONLY, never the API key
        console.error(`[AiService] Groq API returned error: HTTP ${res.status} - ${errorText.substring(0, 300)}`);
        return { ok: false, status: res.status, error: errorText };
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      return { ok: true, content };
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(`[AiService] Groq request failed: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Safely parse JSON from model output, handling potential markdown fences
   */
  static parseModelJson(rawContent) {
    if (!rawContent || typeof rawContent !== 'string') return null;
    let cleaned = rawContent.trim();
    // Strip markdown code fences if present
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned);
    } catch (err) {
      // Find JSON object boundary if leading/trailing prose exists
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
        } catch (innerErr) {
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Main entry point: Rephrase seller listing using Groq.
   * Uses facts ONLY. Never invents details. Retries once if identical.
   * Returns: { rephrasedDescription, suggestions, source: 'ai' | 'template', provider }
   */
  static async rephraseListing(answers) {
    const groqKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
    const category = answers.category || 'other';
    const defaultSuggestions = this.getCategorySuggestions(category);

    // PRIVACY ENFORCEMENT: Strictly omit student name, email, phone, roll number, UPI ID, or delivery address
    const facts = {
      category,
      itemType: answers.itemSubtype || answers.category,
      conditionGrade: answers.conditionGrade || 'Good',
      age: answers.ageOfItem || 'Campus use',
      workingStatus: answers.workingStatus || 'Fully functional',
      defects: answers.defects && answers.defects.trim().toLowerCase() !== 'none' ? answers.defects.trim() : 'None reported',
      accessories: answers.accessories && answers.accessories.trim() ? answers.accessories.trim() : 'None',
      categoryDetails: {
        gears: answers.cycle_gears,
        brakes: answers.cycle_brakes,
        tyres: answers.cycle_tyres,
        lastServiced: answers.cycle_lastServiced,
        calculatorModel: answers.calculator_model,
        calculatorDisplay: answers.calculator_display,
        calculatorBattery: answers.calculator_battery,
        bookEdition: answers.books_edition,
        bookAnnotations: answers.books_markedPages,
        bookBinding: answers.books_missingPages,
        warranty: answers.electronics_warranty,
        charger: answers.electronics_charger,
        batteryHealth: answers.electronics_batteryHealth,
      },
      sellerDescription: answers.sellerDescription || '',
    };

    // System prompt per specification
    const systemMessage = 'You rewrite item descriptions for a campus auction. Use ONLY the facts provided. Never invent details. Keep every defect and the item\'s age clearly stated. Fix grammar and make it clear, friendly and honest, in 3-5 sentences. Return JSON only: {"rephrasedDescription": string, "suggestions": string[]}';

    const userMessageContent = `Item Facts:\n${JSON.stringify(facts, null, 2)}\n\nPlease provide a clear, friendly, and honest 3-5 sentence description rewriting the seller's notes, along with 2-3 category-based questions a buyer would ask.`;

    if (groqKey && !groqKey.includes('your_groq_api_key')) {
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessageContent },
      ];

      // Call 1: Primary attempt
      const result1 = await this.callGroq(messages, groqKey, model);

      if (result1.ok) {
        const parsed1 = this.parseModelJson(result1.content);

        if (parsed1 && typeof parsed1.rephrasedDescription === 'string' && parsed1.rephrasedDescription.trim().length > 0) {
          const originalText = (answers.sellerDescription || '').trim();
          const rephrasedText = parsed1.rephrasedDescription.trim();

          // Rule 4: Check if rephrased text is identical to input; if so, retry once with instruction to rewrite in different words
          if (originalText.length > 0 && rephrasedText.toLowerCase() === originalText.toLowerCase()) {
            console.warn('[AiService] Rephrase output was identical to seller input. Retrying once with rewrite instruction...');
            const retryMessages = [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessageContent },
              { role: 'assistant', content: result1.content },
              {
                role: 'user',
                content: 'Please rewrite in different words. Do not copy the seller\'s exact sentences word for word. Keep it honest and clear.',
              },
            ];

            const result2 = await this.callGroq(retryMessages, groqKey, model);
            if (result2.ok) {
              const parsed2 = this.parseModelJson(result2.content);
              if (
                parsed2 &&
                typeof parsed2.rephrasedDescription === 'string' &&
                parsed2.rephrasedDescription.trim().toLowerCase() !== originalText.toLowerCase()
              ) {
                const combinedSuggestions = Array.isArray(parsed2.suggestions) && parsed2.suggestions.length > 0
                  ? parsed2.suggestions
                  : defaultSuggestions;

                return {
                  rephrasedDescription: parsed2.rephrasedDescription.trim(),
                  suggestions: combinedSuggestions,
                  source: 'ai',
                  provider: 'groq',
                };
              }
            }
          } else {
            // First attempt succeeded and was distinct
            const combinedSuggestions = Array.isArray(parsed1.suggestions) && parsed1.suggestions.length > 0
              ? parsed1.suggestions
              : defaultSuggestions;

            return {
              rephrasedDescription: rephrasedText,
              suggestions: combinedSuggestions,
              source: 'ai',
              provider: 'groq',
            };
          }
        } else {
          console.warn('[AiService] Groq returned malformed JSON. Falling back to template.');
        }
      }
    } else {
      console.warn('[AiService] No valid GROQ_API_KEY configured. Falling back to template.');
    }

    // Fallback: Deterministic template + category suggestions
    return {
      rephrasedDescription: this.buildTemplateDescription(answers),
      suggestions: defaultSuggestions,
      source: 'template',
      provider: 'template_fallback',
    };
  }
}

module.exports = AiService;
