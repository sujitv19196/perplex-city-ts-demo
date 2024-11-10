// Import necessary modules
import { getJson } from "serpapi";
import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import dotenv from 'dotenv';
dotenv.config();

// Initialize OpenAI with API Key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define Zod schema for OpenAI structured output response
const OpenAIResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(z.string()),
});
type OpenAIResponse = z.infer<typeof OpenAIResponseSchema>;

export const search = async (query: string) => {
  const {results, relatedQuestions} = await getLinksandRelatedQuestions(query);
  console.time('aISearch w/ GPT-4o');
  const response = await aISearch(results, query);
  console.timeEnd('aISearch w/ GPT-4o');
  return {response, relatedQuestions};
}

// Function to Query OpenAI with Scraped Data using Structured Output
const aISearch = async (scrapedData: any[], userQuery: string): Promise<OpenAIResponse> => {
  // Step 1: Prepare context by concatenating texts with links
  const context = scrapedData
    .filter(item => item.text) // Exclude empty texts
    .map(item => `Source: ${item.link}\nContent: ${item.text}`)
    .join('\n\n')
    .slice(0, 30000); // Limit to 30000 tokens

  // Step 2: Construct the prompt for OpenAI
  const prompt = `
  You are an intelligent assistant. Using the following information from various sources, answer the user's query comprehensively and cite the sources you used.

  ### User Query:
  ${userQuery}

  ### Information:
  ${context}

  ### Response Format:
  Provide your answer under the "answer" field and list all the sources you used under the "citations" field.

  Example:
  {
    "answer": "Your comprehensive answer here.",
    "citations": [
      "https://example.com/source1",
      "https://example.com/source2"
    ]
  }
  `;

  // Step 3: Send the prompt to OpenAI's Chat API with Structured Output
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06", // Ensure you are using a model that supports structured output
    messages: [
      { role: "system", content: "You answer user's questions based on the relevant text and links provided to you." },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(OpenAIResponseSchema, "response"),
  });

  // Step 4: Extract the parsed response
  const parsedResponse = completion.choices[0]?.message.parsed;

  if (!parsedResponse) {
    throw new Error("Failed to parse OpenAI response.");
  }

  return parsedResponse;
};

// Retrieves links and relatedQuestions based on the query
const getLinksandRelatedQuestions = async (query: string) => {
  console.time('serpSearch');
  const response = await serpSearch(query);
  console.timeEnd('serpSearch');

  const links = response.organic_results.map((result: any) => result.link);

  const relatedQuestions = response.related_searches.map((question: any) => question.query).slice(0, 5);
  
  console.time('scrapeLinks');
  const results = await scrapeLinks(links);
  console.timeEnd('scrapeLinks');

  return {results, relatedQuestions};
}
// uses the SERP API to search for the query
const serpSearch = async (query: string) => {
  const response = await getJson({
    engine: "google",
    api_key: process.env.SERP_API_KEY, 
    q: query,
    location: "Austin, Texas",
  });
  return response;
}

// Mock SERP Search: Replace with actual SERP API call if needed
const mockSerpSearch = async (query: string) => {
  return {
    organic_results: [
      { link: 'https://www.tripadvisor.com/Restaurants-g30196-zfg9900-Austin_Texas.html' },
      { link: 'https://www.austintexas.org/things-to-do/food-and-drink/coffee-and-tea/' },
    ]
  };
}

// Scrape Links: Fetches and extracts text content from each link. 
// Skips links that fail to load or have no content. 
const scrapeLinks = async (links: string[]): Promise<{ link: string, text: string }[]> => {
  const scrape = async (link: string): Promise<{ link: string, text: string }> => {
    try {
      const response = await axios.get(link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        timeout: 10000, // Optional: 10 seconds timeout
      });

      const html = response.data;

      if (!html) {
        console.error(`No HTML content received from ${link}`);
        return { link, text: '' };
      }

      const $ = cheerio.load(html);
      const text = $('body')
        .text()
        .replace(/[\n\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 3000) // Limit to 3000 characters
        .trim();

      return { link, text };
    } catch (error: any) {
      console.error(`Error fetching ${link}:`, error.message);
      return { link, text: '' };
    }
  };

  // Initiate all scrape operations simultaneously
  const promises = links.map(link => scrape(link));

  // Await all scrape operations
  const results = await Promise.all(promises);

  return results;
};


