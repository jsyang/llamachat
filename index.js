import { Ai } from '@cloudflare/ai';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { serveStatic } from 'hono/cloudflare-workers';

const app = new Hono();

let authMiddleware = null;

app.use('*', async (c, next) => {
	if (!authMiddleware) {
		authMiddleware = basicAuth({
			username: c.env.username,
			password: c.env.password,
		});
	}

	return authMiddleware(c, next);
});

app.get('/*', serveStatic({ root: './' }));

import {getTokensForString} from './helpers.js';

app.post('/chat', async (c) => {
	// The entire conversation is stored and sent via client rather than relying on a vector DB
	// The model still has a max input token length of 768 regardless of where the input comes from!
	const { messages } = await c.req.json();

	let allText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
	let inputTokenCount = getTokensForString(allText);

	// Drop messages if over input limit
	while(inputTokenCount >= 768) {
		messages.shift();
		allText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
		inputTokenCount = getTokensForString(allText);
	}

	const ai = new Ai(c.env.AI);

	const answer = await ai.run(
		'@cf/meta/llama-2-7b-chat-int8',
		{ messages }
	);

	return c.json(answer);
});

export default app;
