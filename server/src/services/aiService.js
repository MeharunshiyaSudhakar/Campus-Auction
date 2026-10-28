/**
 * AI Service for Campus Auction
 * Primary: Groq (Llama-3.3-70b)
 * Fallback: OpenRouter
 * Ultimate Safe Fallback: Deterministic Template Engine (offline / judge-safe)
 */

class AiService {
  /**
   * Deterministic template builder used when AI providers are unavailable or offline
   */
  static buildTemplateDescription(answers) {
    const lines = [];
    lines.push(`**${answers.title || 'Item'}**`);
    lines.push(`• **Condition Grade**: ${answers.conditionGrade || 'Good'}`);
    lines.push(`• **Duration of Use**: ${answers.ageOfItem || 'Standard campus use'}`);
    lines.push(`• **Working Status**: ${answers.workingStatus || 'Fully functional'}`);

    if (answers.defects && answers.defects.trim().toLowerCase() !== 'none') {
      lines.push(`• **Disclosed Defects & Wear**: ${answers.defects.trim()}`);
    } else {
      lines.push(`• **Disclosed Defects**: None reported by seller`);
    }

    if (answers.accessories && answers.accessories.trim()) {
      lines.push(`• **Included Accessories**: ${answers.accessories.trim()}`);
    }

    // Category specifics
    if (answers.category === 'cycle') {
      if (answers.cycle_gears) lines.push(`• **Gears**: ${answers.cycle_gears}`);
      if (answers.cycle_brakes) lines.push(`• **Brakes**: ${answers.cycle_brakes}`);
      if (answers.cycle_tyres) lines.push(`• **Tyres**: ${answers.cycle_tyres}`);
      if (answers.cycle_lastServiced) lines.push(`• **Last Serviced**: ${answers.cycle_lastServiced}`);
    } else if (answers.category === 'calculator') {
      if (answers.calculator_model) lines.push(`• **Model**: ${answers.calculator_model}`);
      if (answers.calculator_display) lines.push(`• **Display**: ${answers.calculator_display}`);
      if (answers.calculator_battery) lines.push(`• **Battery**: ${answers.calculator_battery}`);
    } else if (answers.category === 'books') {
      if (answers.books_edition) lines.push(`• **Edition**: ${answers.books_edition}`);
      if (answers.books_markedPages) lines.push(`• **Annotations**: ${answers.books_markedPages}`);
      if (answers.books_missingPages) lines.push(`• **Binding / Pages**: ${answers.books_missingPages}`);
    } else if (answers.category === 'electronics') {
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
   * Rephrase seller answers into an honest, structured description + provide category suggestions
   * Strictly adheres to the rule: USE ONLY SELLER'S FACTS, NEVER INVENT DETAILS.
   */
  static async rephraseListing(answers) {
    const groqKey = process.env.GROQ_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    // Filter out any potential private user fields (pure item facts only)
    const sanitizedFacts = {
      category: answers.category,
      title: answers.title,
      conditionGrade: answers.conditionGrade,
      ageOfItem: answers.ageOfItem,
      workingStatus: answers.workingStatus,
      defects: answers.defects || 'None reported',
      accessories: answers.accessories || 'None',
      sellerDescription: answers.sellerDescription || '',
      categorySpecs: {
        cycle_gears: answers.cycle_gears,
        cycle_brakes: answers.cycle_brakes,
        cycle_tyres: answers.cycle_tyres,
        cycle_lastServiced: answers.cycle_lastServiced,
        calculator_model: answers.calculator_model,
        calculator_display: answers.calculator_display,
        calculator_battery: answers.calculator_battery,
        books_edition: answers.books_edition,
        books_markedPages: answers.books_markedPages,
        books_missingPages: answers.books_missingPages,
        electronics_warranty: answers.electronics_warranty,
        electronics_charger: answers.electronics_charger,
        electronics_batteryHealth: answers.electronics_batteryHealth,
      },
    };

    const systemPrompt = `You are the AI Description Helper for Campus Auction, a transparent peer-to-peer campus marketplace where graduating seniors pass items down to juniors.
CRITICAL RULES:
1. Use ONLY the seller's provided facts. NEVER invent or hallucinate features, warranties, or specs not stated.
2. Maintain an honest, clear, and reassuring tone.
3. If the seller listed defects, state them prominently so buyers know the exact wear.
4. Generate helpful "suggestions": category-based tips for details the seller might have forgotten that buyers usually care about (e.g., "Does the calculator screen have any dead pixels?", "Is the bike bell working?", "Are textbook problem sets solved in pen?").
5. Return strictly valid JSON with no markdown formatting around the JSON object:
{
  "rephrasedDescription": "Clean, well-structured description with markdown bullet points...",
  "suggestions": [
    "Suggestion 1...",
    "Suggestion 2..."
  ]
}`;

    const userMessage = `Here are the item facts provided by the student:\n${JSON.stringify(sanitizedFacts, null, 2)}\n\nPlease rephrase this into a clean, honest description and give 2-3 category suggestions.`;

    // 1. Attempt Groq
    if (groqKey && !groqKey.includes('your_groq_api_key')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const content = data.choices[0]?.message?.content;
          const parsed = JSON.parse(content);
          if (parsed.rephrasedDescription) {
            return {
              rephrasedDescription: parsed.rephrasedDescription,
              suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
              provider: 'groq',
            };
          }
        }
      } catch (err) {
        console.warn(`[AiService] Groq call failed or timed out (${err.message}). Trying fallback...`);
      }
    }

    // 2. Attempt OpenRouter Fallback
    if (openrouterKey && !openrouterKey.includes('your_openrouter_api_key')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'Campus Auction',
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const content = data.choices[0]?.message?.content;
          const parsed = JSON.parse(content);
          if (parsed.rephrasedDescription) {
            return {
              rephrasedDescription: parsed.rephrasedDescription,
              suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
              provider: 'openrouter',
            };
          }
        }
      } catch (err) {
        console.warn(`[AiService] OpenRouter fallback failed (${err.message}).`);
      }
    }

    // 3. Ultimate Fallback: Deterministic Template Engine
    return {
      rephrasedDescription: this.buildTemplateDescription(answers),
      suggestions: [],
      provider: 'template_fallback',
    };
  }
}

module.exports = AiService;
