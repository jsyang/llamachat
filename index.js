import { Ai } from '@cloudflare/ai';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { serveStatic } from 'hono/cloudflare-workers';
import GPT3Tokenizer from 'gpt3-tokenizer';


const app = new Hono();
const tokenizer = new GPT3Tokenizer({ type: 'gpt3' });

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

app.post('/chat', async (c) => {
	// The entire conversation is stored and sent via client rather than relying on a vector DB
	// The model still has a max input token length of 768 regardless of where the input comes from!
	const { messages } = await c.req.json();

	const allText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
	const inputTokenCount = tokenizer.encode(allText).bpe.length;

	const ai = new Ai(c.env.AI);

	const answer = await ai.run(
		'@cf/meta/llama-2-7b-chat-int8',
		{ messages }
	);
	console.log('Input token count: ' + inputTokenCount);

	return c.json(answer);
});

export default app;