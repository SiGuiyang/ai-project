export const AI_CONFIG = {
  baseUrl: process.env.AI_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.AI_API_KEY || "",
  model: process.env.AI_MODEL || "deepseek-chat",
  maxTokens: 4096,
  temperature: 0.1,
};
