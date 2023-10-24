import { Ai } from '@cloudflare/ai';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { serveStatic } from 'hono/cloudflare-workers';

import { getTokensForString, formatMessage, truncateMessages, chunkString } from './helpers.js';

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


app.post('/chat/basic', async (c) => {
	// The entire conversation is stored and sent via client rather than relying on a vector DB
	// The model still has a max input token length of 768 regardless of where the input comes from!
	const ai = new Ai(c.env.AI);
	const { messages } = await c.req.json();

	let allText = messages.map(formatMessage).join('\n');
	let inputTokenCount = getTokensForString(allText);

	// Drop messages if over input limit
	while (inputTokenCount >= 768) {
		const { tokenCount } = truncateMessages(messages);
		inputTokenCount = tokenCount;
	}

	let answer = await ai.run(
		'@cf/meta/llama-2-7b-chat-int8',
		{ messages }
	);

	// Drop messages if LLM response is empty
	while (answer.response.length === 0) {
		truncateMessages(messages);
		answer = await ai.run(
			'@cf/meta/llama-2-7b-chat-int8',
			{ messages }
		);
	}

	c.header('Cache-Control', 'no-cache');

	return c.json(answer);
});

// !!!! RAG !!!!

import { getLongestWallOfTextFromURL } from './loader.js';

app.post('/chat/process-url', async (c) => {
	const url = await c.req.text();

	if (!url) {
		return c.text("Missing url", 400);
	}

	const text = (await getLongestWallOfTextFromURL(url));

	return c.text(text);
});

app.post('/chat/add-note', async c => {
	const ai = new Ai(c.env.AI)

	const text = chunkString(await c.req.text(), 300);

	const d1Results = await Promise.all(
		text.map(blurb => c.env.DB.prepare("INSERT INTO notes (text) VALUES (?) RETURNING *")
			.bind(blurb)
			.run()
			.then(op => op.results[0].id)
		)
	);

	const embeddingResults = await Promise.all(
		text.map(blurb => ai.run('@cf/baai/bge-base-en-v1.5', { text: [blurb] })
			.then(results => results.data[0])
		)
	);

	const vectorDBUpserts = [];

	for (let i = 0; i < d1Results.length; i++) {
		if (embeddingResults[i] && d1Results[i]) {
			vectorDBUpserts.push(
				{
					id: d1Results[i],
					values: embeddingResults[i],
				}
			);
		}
	}

	const inserted = await c.env.VECTORIZE_INDEX.upsert(vectorDBUpserts);

	return c.json({ inserted });
});

const systemPrompt = { role: 'system', content: `When answering the question or responding, use the context provided, if it is provided and relevant.` };

app.post('/chat/notes', async (c) => {
	const ai = new Ai(c.env.AI);
	const { messages } = await c.req.json();

	const question = messages[messages.length - 1].content;

	console.log(question);

	const embeddings = await ai.run('@cf/baai/bge-base-en-v1.5', { text: question });
	const vectors = embeddings.data[0];

	console.log(vectors);

	const SIMILARITY_CUTOFF = 0.5;
	const vectorQuery = await c.env.VECTORIZE_INDEX.query(vectors, { topK: 2 });
	const vecIds = vectorQuery.matches
		.filter(vec => vec.score > SIMILARITY_CUTOFF)
		.map(vec => vec.vectorId);

	console.log(vecIds);

	let notes = [];
	if (vecIds.length) {
		const query = `SELECT * FROM notes WHERE id IN (${vecIds.join(", ")})`;
		const { results } = await c.env.DB.prepare(query).bind().all();
		if (results) notes = results.map(vec => vec.text);
	}

	const contextMessage = notes.length
		? `Context:\n${notes.map(note => `- ${note}`).join("\n")}`
		: "";

	console.log(notes);

	// The entire conversation is stored and sent via client rather than relying on a vector DB
	// The model still has a max input token length of 768 regardless of where the input comes from!

	let allText = messages.map(formatMessage).join('\n');
	let inputTokenCount = getTokensForString(allText);

	// Drop messages if over input limit
	while (inputTokenCount >= 768) {
		const { tokenCount } = truncateMessages(messages);
		inputTokenCount = tokenCount;
	}

	let answer = await ai.run(
		'@cf/meta/llama-2-7b-chat-int8',
		{
			messages: [
				...(notes.length ? [{ role: 'system', content: contextMessage }] : []),
				systemPrompt,
				...messages,
			]
		}
	);

	// Drop messages if LLM response is empty
	while (answer.response.length === 0) {
		truncateMessages(messages);
		answer = await ai.run(
			'@cf/meta/llama-2-7b-chat-int8',
			{
				messages: [...(notes.length ? [{ role: 'system', content: contextMessage }] : []),
					systemPrompt,
				...messages,
				]
			}
		);
	}

	return c.json(answer);
});


// For use with Google Sheets

// 1. Extensions > Apps Script
// 2. Create a new function to accept the event param
// 3. Set up an "edit" trigger so that this function fires every time a cell value is edited on the sheet
// 4. Use the docs to build a call to post the cell changed and then set the east-neighboring cell to the prompt answer
// Apps Script reference
// - https://developers.google.com/apps-script/guides/triggers/events
// - https://developers.google.com/apps-script/reference/spreadsheet/range#methods
// - https://developers.google.com/apps-script/reference/url-fetch/http-response#getcontenttext
// 5. You can check the log of your Apps Script to see what went wrong or to see logs from the execution using `Logger.log()`

app.post('/raw/chat', async (c) => {
	const { prompt, user, pass } = await c.req.json();

	if (user !== c.env.username || pass !== c.env.password) {
		c.status(403);
		return c.json({ error: 'Not authed!' });
	}

	// The entire conversation is stored and sent via client rather than relying on a vector DB
	// The model still has a max input token length of 768 regardless of where the input comes from!
	const ai = new Ai(c.env.AI);

	const answer = await ai.run(
		'@cf/meta/llama-2-7b-chat-int8',
		{ prompt }
	);

	return c.text(answer.response);
});


export default app;
