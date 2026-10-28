const dotenv = require('dotenv');
dotenv.config();

class AssistantService {
  /**
   * Generates a conversational reply using Groq's OpenAI-compatible completions API
   *
   * @param {string} userMessage - The student's question
   * @param {Array<{role: string, content: string}>} conversationHistory - Prior turns
   * @returns {Promise<{reply: string, source: 'groq' | 'fallback'}>}
   */
  static async chat(userMessage, conversationHistory = []) {
    const trimmedMessage = String(userMessage || '').trim();
    if (!trimmedMessage) {
      const error = new Error('Message cannot be empty');
      error.statusCode = 400;
      throw error;
    }

    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

    const systemPrompt = `You are CampusBot, the helpful and friendly AI Assistant for "Campus Auction" — a transparent, honest peer-to-peer university marketplace where seniors pass down pre-loved campus essentials (cycles, scientific calculators, textbooks, lab equipment, electronics, furniture, sports gear) to juniors.

Your job is to assist students with:
1. Bidding Strategies:
   - Setting a personal ceiling price before bidding so students don't overspend in the heat of an auction.
   - Understanding minimum bid increments (usually ₹10 to ₹50).
   - Carefully checking the seller's condition grade (New, Like new, Good, Fair, Poor) and reading the defect disclosures before placing bids.
2. Anti-Sniping Protection:
   - Explain that a valid bid placed in the final 30 seconds moves the closing time to 60 seconds after that bid.
   - This ensures all genuine student bidders have a full minute to respond and prevents unfair last-second bot sniping.
3. Email & In-App Notifications:
   - When outbid: Students receive instant in-app alerts and notifications to their campus email address so they never lose an item by surprise.
   - Closing soon: Reminders sent as auctions enter their final hours.
   - Seller approval: Winners get an email/app notification immediately when the seller approves their winning price.
   - Unsold item alerts: Sellers are notified if their listing has no bids for 3 days or ends unsold, prompting them to adjust starting price or relist.
4. Seller Approval & 6-Digit Handover Verification Code:
   - The seller has 24 hours to approve or reject the final winning price.
   - Once approved, a private deal tracker opens and the winning junior receives a confidential 6-digit Handover Code.
   - During the campus pickup, the junior physically inspects the item against the senior's honesty disclosure.
   - If satisfied, the junior gives the 6-digit code to the senior, who enters it in the app to complete the transaction securely.
5. Payment Options:
   - Online payment via Razorpay Route: buyer's payment is held securely in escrow and released to the seller upon verified handover.
   - Direct UPI QR: buyer scans seller's UPI QR code directly.
   - Cash on Pickup: simple cash exchange in person during handover.
6. Safety & Privacy:
   - Never ask for or expose private student credentials (passwords, bank details, roll numbers, or personal phone numbers).
   - Keep answers clear, friendly, structured with bullet points, and under 3-5 short paragraphs.`;

    // Filter and sanitize recent conversation history (keep last 6 turns)
    const recentHistory = Array.isArray(conversationHistory)
      ? conversationHistory
          .slice(-6)
          .filter((msg) => msg && typeof msg.content === 'string' && ['user', 'assistant'].includes(msg.role))
          .map((msg) => ({
            role: msg.role,
            content: msg.content.substring(0, 1000),
          }))
      : [];

    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: trimmedMessage.substring(0, 1000) },
    ];

    if (!apiKey) {
      console.warn('[AssistantService] GROQ_API_KEY is not configured; using smart fallback response.');
      return {
        reply: this.generateSmartFallback(trimmedMessage),
        source: 'fallback',
      };
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.6,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`[AssistantService] Groq API returned status ${response.status}: ${errorText.substring(0, 200)}`);
        return {
          reply: this.generateSmartFallback(trimmedMessage),
          source: 'fallback',
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        return {
          reply: this.generateSmartFallback(trimmedMessage),
          source: 'fallback',
        };
      }

      return {
        reply: content,
        source: 'groq',
      };
    } catch (err) {
      console.error(`[AssistantService] Groq request error: ${err.message}`);
      return {
        reply: this.generateSmartFallback(trimmedMessage),
        source: 'fallback',
      };
    }
  }

  /**
   * High-quality fallback answers when Groq is temporarily unreachable or offline
   */
  static generateSmartFallback(message) {
    const lower = message.toLowerCase();

    if (lower.includes('anti-snip') || lower.includes('timer') || lower.includes('extend')) {
      return `⏱️ **Anti-Sniping Protection on Campus Auction**\n\n- A valid bid placed in the **final 30 seconds** moves the closing time to **60 seconds after that bid**.\n- This gives all interested bidders a full minute to consider and place a counter-bid, completely stopping last-second bot sniping.\n- If another bid comes in during those 60 seconds (once under 30s remaining), the timer resets again to 60 seconds after that new bid!`;
    }

    if (lower.includes('strategy') || lower.includes('bidding') || lower.includes('bid') || lower.includes('win')) {
      return `🎯 **Smart Bidding Strategies for Campus Auctions**\n\n1. **Inspect Before Bidding**: Read the senior's 100% honesty disclosure, condition grade, and check the defect photos.\n2. **Set a Ceiling Budget**: Decide your maximum willingness to pay early so you don't overbid emotionally.\n3. **Watch the Increments**: Each bid increases by at least the minimum increment (e.g. ₹10 or ₹20).\n4. **Stay Alert for Anti-Sniping**: A valid bid placed in the final 30 seconds moves the closing time to 60 seconds after that bid, giving everyone a fair chance to react!\n5. **Check Your Email**: You'll receive instant email notifications if another junior outbids you.`;
    }

    if (lower.includes('notification') || lower.includes('mail') || lower.includes('email') || lower.includes('alert')) {
      return `📧 **Email & In-App Notifications**\n\nCampus Auction keeps you updated in real-time via your campus email and the in-app bell icon:\n\n- **Outbid Alerts**: Sent immediately to your email when someone tops your bid, so you have time to counter.\n- **Ending Soon**: Alerts you when auctions you've bid on or watchlisted are about to close.\n- **Seller Approval**: Winning buyers receive email notifications the moment the senior approves the final price.\n- **Unsold Alerts**: Sellers are notified if their item has 0 bids after 3 days or ends unsold so they can discount or relist with one click!`;
    }

    if (lower.includes('handover') || lower.includes('code') || lower.includes('pickup') || lower.includes('delivery')) {
      return `🤝 **6-Digit Handover Code & In-Person Verification**\n\n- After the seller approves the winning bid, the buyer receives a **secret 6-digit Handover Code** in their deal tracker.\n- Both students meet at a campus landmark (e.g. library, hostel gate, campus cafe).\n- The buyer physically inspects the item to ensure it matches the disclosed condition.\n- Once satisfied, the buyer gives the 6-digit code to the seller, who inputs it into the app to complete the deal securely!`;
    }

    if (lower.includes('payment') || lower.includes('upi') || lower.includes('cash') || lower.includes('razorpay')) {
      return `💳 **Payment Options Available**\n\n- **Online via Razorpay Route**: Test-mode split payment where the buyer's payment is held safely until handover is confirmed.\n- **Direct UPI QR**: Buyer scans the seller's UPI QR code directly after price approval.\n- **Cash on Pickup**: Simple physical cash exchange at the time of handover.\n\nAll payment choices are agreed upon before the physical handover!`;
    }

    return `👋 **Welcome to Campus Auction AI Assistant!**\n\nI can help you with:\n- 🎯 **Bidding Strategy & Anti-Sniping Rules** (how the 30-second extension protects you)\n- 📧 **Email & In-App Notifications** (outbid alerts, ending soon reminders, deal updates)\n- 🤝 **Handover Code Verification** (inspecting condition and 6-digit pickup verification)\n- 💳 **Payment Methods** (Razorpay escrow, Direct UPI QR, and Cash on Pickup)\n\nFeel free to ask any question or tap one of the quick chips above!`;
  }
}

module.exports = AssistantService;
