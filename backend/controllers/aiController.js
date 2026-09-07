const axios = require('axios');

// Aggressively extract clean review text from AI response
function extractCleanText(raw) {
  if (!raw) return '';
  
  let text = raw;
  
  // Remove <think>...</think> blocks
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  // Remove markdown code fences
  text = text.replace(/```[\s\S]*?```/g, '');
  
  // Split into lines and filter out thinking/analysis lines
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const cleanLines = lines.filter(line => {
    // Remove numbered list items (1. **Analyze...**)
    if (/^\d+\.\s/.test(line)) return false;
    // Remove bullet points
    if (/^[-*]\s/.test(line)) return false;
    // Remove lines with markdown bold **text**
    if (/\*\*/.test(line)) return false;
    // Remove lines with markdown headers
    if (/^#+\s/.test(line)) return false;
    // Remove lines that look like analysis/meta
    if (/^(critique|draft|attempt|analysis|constraint|identify|topic|length|style|output|must mention|here'?s|sure|okay|let me)/i.test(line)) return false;
    // Remove very short lines (likely labels)
    if (line.length < 10) return false;
    return true;
  });
  
  // Take the last clean line(s) - that's usually the actual review
  if (cleanLines.length > 0) {
    return cleanLines[cleanLines.length - 1].replace(/^["']|["']$/g, '').trim();
  }
  
  // Fallback: try to find any quoted text in the original
  const quoted = raw.match(/"([^"]{15,})"/);
  if (quoted) return quoted[1].trim();
  
  return '';
}

// Extract chip phrases from AI response
function extractChips(raw) {
  if (!raw) return [];
  
  let text = raw;
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  // Try pipe-separated first
  if (text.includes('|')) {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('|')) {
        const chips = line.split('|').map(c => c.trim().replace(/^\d+\.\s*/, '').replace(/^["'*]|["'*]$/g, '')).filter(c => c.length > 2 && c.length < 60);
        if (chips.length >= 3) return chips.slice(0, 3);
      }
    }
  }
  
  // Try numbered list (1. phrase 2. phrase 3. phrase)
  const numbered = text.match(/\d+\.\s*([^\d\n.]{3,40})/g);
  if (numbered && numbered.length >= 3) {
    return numbered.slice(0, 3).map(n => n.replace(/^\d+\.\s*/, '').replace(/[*"']/g, '').trim());
  }
  
  return [];
}

// Helper: call OpenRouter with retry across multiple models
async function callOpenRouter(messages, apiKey, retries = 3) {
  const models = ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free', 'minimax/minimax-m3:free'];
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const model = models[attempt % models.length];
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: model,
        messages: messages,
        temperature: 0.9,
        max_tokens: 200,
        top_p: 0.95,
        seed: Math.floor(Math.random() * 999999),
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
          'X-Title': 'QR Menu SaaS'
        },
        timeout: 15000
      });
      
      const raw = response.data?.choices?.[0]?.message?.content?.trim() || '';
      console.log('Raw AI response (' + model + '):', raw.substring(0, 100) + '...');
      if (raw) return raw;
    } catch (err) {
      console.log(`Attempt ${attempt + 1} failed: ${err.response?.data?.error?.message || err.message}`);
      if (attempt < retries - 1) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return null;
}

// @desc    Handle AI feedback assistance
// @route   POST /api/feedback/ai-assist  
// @access  Public
const aiFeedbackAssist = async (req, res, next) => {
  try {
    const { rating, text, action } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'AI API key not configured' });
    }

    if (action === 'suggest_chips' && rating) {
      const messages = [
        { role: 'user', content: `Generate exactly 3 short realistic cafe review phrases (max 5 words each) for a ${rating}-star experience. Write like a real customer. Separate them with | character. Output ONLY the 3 phrases separated by |, nothing else. Example: Great food!|Loved it!|Best cafe ever` }
      ];
      
      const raw = await callOpenRouter(messages, apiKey);
      const chips = extractChips(raw);
      
      if (chips.length >= 3) {
        return res.status(200).json({ success: true, suggestions: chips });
      }
      
      const fallbacks = {
        5: ['Amazing experience!', 'Loved the food!', 'Highly recommend!'],
        4: ['Great food overall!', 'Really enjoyed it!', 'Would visit again!'],
        3: ['It was decent', 'Average experience', 'Room for improvement'],
        2: ['Not impressed', 'Below average', 'Disappointing food'],
        1: ['Terrible experience', 'Would not return', 'Waste of money']
      };
      const key = Math.min(5, Math.max(1, parseInt(rating)));
      return res.status(200).json({ success: true, suggestions: fallbacks[key] || fallbacks[3] });
      
    } else if (action === 'auto_write' && rating) {
      const messages = [
        { role: 'user', content: `Write a short realistic ${rating}-star cafe review in 1-2 simple sentences. Write like a normal customer - casual and natural. Mention food, service, or ambiance. Output ONLY the review text, nothing else.` }
      ];
      
      const raw = await callOpenRouter(messages, apiKey);
      const reviewText = extractCleanText(raw);
      
      if (reviewText && reviewText.length >= 10) {
        return res.status(200).json({ success: true, text: reviewText });
      }
      
      return res.status(200).json({ success: true, text: rating >= 4 ? 'Had a wonderful experience! The food was delicious and the atmosphere was perfect.' : 'The experience was decent but there is room for improvement.' });
      
    } else if (action === 'auto_rate' && text) {
      const messages = [
        { role: 'user', content: `Rate this cafe review from 1 to 5 stars. Output ONLY a single number, nothing else. Review: "${text}"` }
      ];
      
      const raw = await callOpenRouter(messages, apiKey);
      if (raw) {
        const match = raw.match(/[1-5]/);
        if (match) return res.status(200).json({ success: true, rating: parseInt(match[0]) });
      }
      
      return res.status(200).json({ success: true, rating: 3 });
      
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action or missing parameters' });
    }
  } catch (error) {
    console.error('AI Feedback Error:', error.message);
    res.status(500).json({ success: false, message: 'AI service temporarily unavailable' });
  }
};

module.exports = {
  aiFeedbackAssist
};
