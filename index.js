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

import { getTokensForString, formatMessage } from './helpers.js';

app.post('/chat', async (c) => {
	// The entire conversation is stored and sent via client rather than relying on a vector DB
	// The model still has a max input token length of 768 regardless of where the input comes from!
	const { messages } = await c.req.json();
	console.log('Msg length', messages.length);

	let allText = messages.map(formatMessage).join('\n');
	let inputTokenCount = getTokensForString(allText);

	console.log('initial itc', inputTokenCount);
	
	// Drop messages if over input limit
	while (inputTokenCount >= 768) {
		console.log('Crunching messages... ', messages.length);
		messages.shift();
		allText = messages.map(formatMessage).join('\n');
		inputTokenCount = getTokensForString(allText);
		console.log('itc', inputTokenCount);
	}
	
	console.log('final itc', inputTokenCount);

	const ai = new Ai(c.env.AI);

	console.log('Msg length', messages.length);

	const answer = await ai.run(
		'@cf/meta/llama-2-7b-chat-int8',
		{ messages }
	);

	return c.json(answer);
});

export default app;
