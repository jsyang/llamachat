import { Ai } from '@cloudflare/ai';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { serveStatic } from 'hono/cloudflare-workers';
import { cors } from 'hono/cors';

import { formatMessage, truncateMessages } from './helpers';
import { LLAMA2_CHAT_INPUT_CONTEXT_TOKEN_LIMIT } from './constants';

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

	const answer = await ai.run(
		'@cf/meta/llama-3-8b-instruct',
		{ messages, stream: true, max_tokens: 2500 }
	);

	c.header('Content-Type', 'text/event-stream');
	c.header('Cache-Control', 'no-cache');

	return c.stream(async stream => {
		await stream.pipe(answer);
		await stream.close();
	});
});


app.post('/chat/completion', async (c) => {
	let { params, model = '@cf/meta/llama-3-8b-instruct' } = await c.req.json();

	const ai = new Ai(c.env.AI);

	const answer = await ai.run( model, params);

	c.header('Content-Type', 'text/event-stream');
	c.header('Cache-Control', 'no-cache');

	return c.stream(async stream => {
		await stream.pipe(answer);
		await stream.close();
	});
});

///////////////////////////////////////////////////
import addRAGRoutes from './addRAGRoutes';
addRAGRoutes(app);
///////////////////////////////////////////////////
import addRAWRoutes from './addRAWRoutes';
addRAWRoutes(app);
///////////////////////////////////////////////////
import addImageGenRoutes from './addImageGenRoutes';
addImageGenRoutes(app);


export default app;
