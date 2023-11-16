// WhatsApp integration

function addWARoutes(app) {

    app.post('/chat/wa', async (c) => {
        let error;
        const { text, to } = await c.req.json();

        if (text.length === 0) {
            error = { error: 'No message text!' }
        }

        if (to.length === 0) {
            error = { error: 'No recipient!' }
        }

        if (error) {
            c.status(400);
            return c.json(error);
        }

        console.log(c.env.API_AUTH);

        const res = await fetch('https://api.nexmo.com/v1/messages', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${c.env.API_AUTH}`
            },
            body: JSON.stringify({
                "message_type": "text",
                "channel": "whatsapp",
                from: c.env.FROM_NUMBER,
                to,
                text,
            })
        });

        return c.json(await res.json());
    });
}

export default addWARoutes;
