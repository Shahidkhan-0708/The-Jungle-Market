import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

export const runtime = 'edge';

const openrouter = createOpenAI({
  baseURL: process.env.FACTORY_API_BASE_URL || 'https://openrouter.ai/api/v1',
  apiKey: process.env.FACTORY_API_KEY,
});

export async function POST(req: Request) {
  const body: any = await req.json();
  const messages = body?.messages || [];

  const result = streamText({
    model: openrouter('meta-llama/llama-3.1-8b-instruct') as any,
    messages,
    system: "You are the Jungle Market AI Guide. Help users discover sustainable and authentic crafts from local artisans. Be concise and friendly. If they ask to see crafts, search for them using your tool.",
    tools: {
      searchCrafts: tool({
        description: 'Search for crafts based on user query (e.g. category, material, region, price)',
        inputSchema: z.object({
          query: z.string().describe('The search query for crafts'),
          maxPrice: z.number().optional().describe('Maximum price in INR'),
        }),
        execute: async ({ query, maxPrice }: { query: string; maxPrice?: number }) => {
          // In a real scenario, this would query your /v1/catalog/search endpoint or database.
          // For the SIH demo, we will return some mock rich data to be rendered as UI.
          return [
            {
              id: 'c1',
              title: `Handwoven ${query} Basket`,
              artisan: 'Sunita Devi',
              region: 'Assam',
              price: maxPrice ? Math.floor(maxPrice * 0.8) : 1500,
              image_uri: 'https://images.unsplash.com/photo-1595878715977-2e8f8df18ea8?auto=format&fit=crop&q=80&w=400',
              category: 'Home & Living'
            },
            {
              id: 'c2',
              title: `Terracotta ${query} Vase`,
              artisan: 'Ramesh Kumhar',
              region: 'Rajasthan',
              price: maxPrice ? Math.floor(maxPrice * 0.5) : 850,
              image_uri: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=400',
              category: 'Decor'
            }
          ];
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
