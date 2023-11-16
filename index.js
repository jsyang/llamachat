import { Ai } from '@cloudflare/ai';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { serveStatic } from 'hono/cloudflare-workers';
import { cors } from 'hono/cors';

import { getTokensForString, formatMessage, truncateMessages, chunkString } from './helpers.js';
import {LLAMA2_CHAT_INPUT_CONTEXT_TOKEN_LIMIT} from './constants';

const app = new Hono();

let authMiddleware = null;

app.use('/chat/*', async (c, next) => {
	if (!authMiddleware) {
		authMiddleware = basicAuth({
			username: c.env.username,
			password: c.env.password,
		});
	}

	return authMiddleware(c, next);
});

app.get('/*', serveStatic({ root: './' }));

app.use('*', cors());

app.post('/chat/basic', async (c) => {
	// The entire conversation is stored and sent via client rather than relying on a vector DB
	// The model still has a max input token length of 768 regardless of where the input comes from!
	const ai = new Ai(c.env.AI);
	const { messages } = await c.req.json();

	let allText = messages.map(formatMessage).join('\n');
	let inputTokenCount = allText.length;

	// Drop messages if over input limit
	while (inputTokenCount >= LLAMA2_CHAT_INPUT_CONTEXT_TOKEN_LIMIT) {
		const { tokenCount } = truncateMessages(messages);
		inputTokenCount = tokenCount;
	}

	let answer = await ai.run(
		'@cf/meta/llama-2-7b-chat-fp16',
		{ messages }
	);

	// Drop messages if LLM response is empty
	while (answer.response.length === 0) {
		truncateMessages(messages);
		answer = await ai.run(
			'@cf/meta/llama-2-7b-chat-fp16',
			{ messages }
		);
	}

	c.header('Cache-Control', 'no-cache');

	return c.json(answer);
});


app.post('/chat/completion', async (c) => {
	let { prompt } = await c.req.json();

	const ai = new Ai(c.env.AI);

	prompt = prompt.slice(prompt.length - LLAMA2_CHAT_INPUT_CONTEXT_TOKEN_LIMIT);

	const answer = await ai.run(
		'@cf/meta/llama-2-7b-chat-int8',
		{ prompt }
	);

	c.header('Cache-Control', 'no-cache');

	return c.json(answer);
});

///////////////////////////////////////////////////
import addRAGRoutes from './addRAGRoutes.js';
addRAGRoutes(app);
///////////////////////////////////////////////////
import addRAWRoutes from './addRAWRoutes.js';
addRAWRoutes(app);
///////////////////////////////////////////////////
import addWARoutes from './addWARoutes.js';
addWARoutes(app);


export default app;
