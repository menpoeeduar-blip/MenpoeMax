import { Router } from "express";
import { getOrCreateUser } from "../lib/clerk";
import OpenAI from "openai";

const router = Router();

function getOpenAI() {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error("AI integration not configured");
  }
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

// POST /api/ai/generate-post
router.post("/generate-post", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { topic, tone = "casual", includeHashtags = true } = req.body;
  if (!topic) return res.status(400).json({ error: "topic is required" });

  const toneMap: Record<string, string> = {
    professional: "professional and formal",
    casual: "friendly and conversational",
    funny: "humorous and witty",
    inspirational: "motivational and uplifting",
  };

  const prompt = `Write a social media post about "${topic}" in a ${toneMap[tone] || "casual"} tone. Keep it under 280 characters.${includeHashtags ? " Include 3-5 relevant hashtags." : ""} Only output the post text, nothing else.`;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
  });

  const content = completion.choices[0]?.message?.content ?? "";
  const hashtags = content.match(/#\w+/g) ?? [];

  return res.json({ content, suggestedHashtags: hashtags });
});

// GET /api/ai/trending-topics
router.get("/trending-topics", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const topics = [
    { topic: "#Technology", postsCount: 45230, trend: "rising" },
    { topic: "#Innovation", postsCount: 32100, trend: "rising" },
    { topic: "#AI", postsCount: 89450, trend: "rising" },
    { topic: "#Design", postsCount: 21000, trend: "stable" },
    { topic: "#Startup", postsCount: 18700, trend: "rising" },
    { topic: "#SocialMedia", postsCount: 15400, trend: "stable" },
    { topic: "#Business", postsCount: 12000, trend: "falling" },
    { topic: "#Marketing", postsCount: 10500, trend: "stable" },
  ];

  return res.json(topics);
});

// GET /api/dashboard/summary
router.get("/../dashboard/summary", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  return res.json({
    totalUsers: 124500,
    activePosts: 8930,
    onlineNow: 3200,
    newNotifications: 0,
    trendingHashtags: ["#Technology", "#AI", "#Innovation", "#Design", "#Startup"],
    suggestedUsers: [],
    upcomingEvents: [],
  });
});

export default router;
