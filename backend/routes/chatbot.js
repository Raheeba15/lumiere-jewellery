require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const { db } = require('../database');
const router = express.Router();

// ── helpers ──────────────────────────────────────────────────────────────────

function getProducts(filters = {}) {
  let query = `
    SELECT p.id, p.name, p.price, p.stock, p.emoji, p.image_url, p.material, p.description,
           c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1
  `;
  const params = [];

  if (filters.category) {
    query += ' AND c.slug = ?';
    params.push(filters.category);
  }
  if (filters.maxPrice) {
    query += ' AND p.price <= ?';
    params.push(filters.maxPrice);
  }
  if (filters.minPrice) {
    query += ' AND p.price >= ?';
    params.push(filters.minPrice);
  }
  if (filters.search) {
    query += ' AND (p.name LIKE ? OR p.material LIKE ? OR p.description LIKE ?)';
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  if (filters.featured) {
    query += ' AND p.featured = 1';
  }

  query += ' ORDER BY p.featured DESC, p.id ASC LIMIT 6';
  return db.prepare(query).all(...params);
}

function getOrder(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  const items = db.prepare(`
    SELECT oi.*, p.name, p.emoji FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(orderId);
  return { ...order, items };
}

// ── system prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt() {
  let categories = [];
  try {
    categories = db.prepare('SELECT name, slug FROM categories').all();
  } catch (e) {}

  const catList = categories.map(c => c.slug).join(', ') || 'bracelets, rings, bangles, necklaces';

  return `You are Lumière's elegant AI shopping assistant for a fine jewellery store based in Lahore, Pakistan.
You are helpful, warm, and knowledgeable about jewellery. Speak with a refined, friendly tone.

The store sells: ${catList}. Prices are in Pakistani Rupees (Rs).
Free shipping on orders above Rs 5,000. Returns accepted within 15 days.
Payment methods: Cash on Delivery (COD), bank transfer, credit/debit cards.

You have access to these ACTIONS. When you need to use one, respond ONLY with a JSON block (no extra text, no markdown):

For product search:
{"action":"search","params":{"category":"rings","maxPrice":5000,"minPrice":500,"search":"gold"}}

For order tracking:
{"action":"track","params":{"orderId":123}}

For adding to cart:
{"action":"addToCart","params":{"productId":5}}

Available categories: ${catList}
Price range: typically Rs 500 – Rs 50,000

Rules:
- If user asks to see products, mentions a category, or gives a budget → respond ONLY with the search JSON
- If user asks about their order or gives an order number → respond ONLY with the track JSON
- If user asks to add something to cart → respond ONLY with the addToCart JSON
- For shipping/returns/payment questions → answer directly in plain text
- Never include markdown, code fences, or extra text when returning JSON
- Keep responses concise and helpful`;
}

// ── conversation store ────────────────────────────────────────────────────────

const conversations = new Map();

function getHistory(sessionId) {
  if (!conversations.has(sessionId)) conversations.set(sessionId, []);
  return conversations.get(sessionId);
}

// ── call Groq API (free) ──────────────────────────────────────────────────────

async function callGroq(systemPrompt, history) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history
  ];

const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages,
    max_tokens: 600,
    temperature: 0.7
  })
});

if (!res.ok) {
  const err = await res.text();
  console.error('Groq API error:', err);
  throw new Error('Groq API error: ' + err);
}


  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── main chat endpoint ────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const sessionId = req.session?.id || 'guest-' + Date.now();
  const history = getHistory(sessionId);

  history.push({ role: 'user', content: message });
  const recentHistory = history.slice(-10);

  try {
    const rawReply = await callGroq(buildSystemPrompt(), recentHistory);

    console.log('Groq raw reply:', rawReply);

    history.push({ role: 'assistant', content: rawReply });

    // Parse action JSON if present
    let displayReply = rawReply;
    let actionResult = null;

    const jsonMatch = rawReply.match(/\{[\s\S]*"action"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.action === 'search') {
          const products = getProducts(parsed.params || {});
          actionResult = { type: 'products', data: products };
          displayReply = products.length
            ? `Here are some pieces I found for you ✦`
            : `I couldn't find products matching that. Try a different search?`;

        } else if (parsed.action === 'track') {
          const orderId = parsed.params?.orderId;
          if (!orderId) {
            displayReply = 'Could you please share your order number? (e.g. "track order 42")';
          } else {
            const order = getOrder(orderId);
            if (order) {
              actionResult = { type: 'order', data: order };
              displayReply = `Here's your order status ✦`;
            } else {
              displayReply = `I couldn't find order #${orderId}. Please double-check the number.`;
            }
          }

        } else if (parsed.action === 'addToCart') {
          const productId = parsed.params?.productId;
          if (productId) {
            const product = db.prepare(`
              SELECT p.*, c.name as category_name FROM products p
              LEFT JOIN categories c ON p.category_id = c.id
              WHERE p.id = ? AND p.active = 1`).get(productId);
            if (product) {
              actionResult = { type: 'addToCart', data: product };
              displayReply = `Adding **${product.name}** to your cart ✦`;
            } else {
              displayReply = `I couldn't find that product. Want me to search for something specific?`;
            }
          }
        }
      } catch (e) {
        // Not valid JSON, treat as plain text
      }
    }

    res.json({ reply: displayReply, action: actionResult });

  } catch (err) {
  console.error('Chatbot error:', err.message);

  // Only use fallback if Groq fails
  res.json({ reply: getFallbackReply(message), action: null });
}
});

// ── clear conversation ────────────────────────────────────────────────────────

router.delete('/history', (req, res) => {
  const sessionId = req.session?.id || 'guest';
  conversations.delete(sessionId);
  res.json({ success: true });
});

// ── fallback ──────────────────────────────────────────────────────────────────

function getFallbackReply(message) {
  const msg = message.toLowerCase();
  if (msg.includes('ship')) return 'We offer free shipping on orders above Rs 5,000. Standard delivery takes 3–5 business days across Pakistan.';
  if (msg.includes('return')) return 'We have a 15-day hassle-free return policy. Items must be unused and in original packaging.';
  if (msg.includes('payment')) return 'We accept Cash on Delivery (COD), bank transfer, and all major credit/debit cards.';
  if (msg.includes('ring')) return 'Check our beautiful ring collection at /shop?category=rings!';
  if (msg.includes('bracelet')) return 'Explore our bracelet collection at /shop?category=bracelets!';
  return "Hello! I'm here to help you find the perfect jewellery. Ask me about our products, your order status, or anything else! ✦";
}

module.exports = router;