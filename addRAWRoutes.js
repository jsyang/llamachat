function addRAWRoutes(app) {

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

    app.post('/raw/completion', async (c) => {
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

    app.post('/raw/chat', async (c) => {
        const { messages, user, pass } = await c.req.json();

        if (user !== c.env.username || pass !== c.env.password) {
            c.status(403);
            return c.json({ error: 'Not authed!' });
        }

        // The entire conversation is stored and sent via client rather than relying on a vector DB
        // The model still has a max input token length of 768 regardless of where the input comes from!
        const ai = new Ai(c.env.AI);

        console.log(messages);

        const answer = await ai.run(
            '@cf/meta/llama-2-7b-chat-int8',
            { messages }
        );

        return c.text(answer.response);
    });

}

export default addRAWRoutes;