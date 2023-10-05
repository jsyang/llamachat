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


app.get('/', serveStatic({ root: './' }));

app.post('/chat', async (c) => {
	const {prompt} = await c.req.json();

	const ai = new Ai(c.env.AI);

	const messages = [
		{ role: 'system', content: 'You are a friendly assistant' },
		{ role: 'user', content: prompt }
	];

	const answer = await ai.run(
		'@cf/meta/llama-2-7b-chat-int8',
		{ messages }
	);

	return c.json(answer);
});

export default app;