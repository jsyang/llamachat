import { Ai } from '@cloudflare/ai';

function addImageGenRoutes(app) {

    app.post('/chat/image', async (c) => {
        const { prompt } = await c.req.json();

        const ai = new Ai(c.env.AI);

        const response = await ai.run(
            '@cf/stabilityai/stable-diffusion-xl-base-1.0',
            { prompt }
        );

        return new Response(response, {
            headers: {
                "content-type": "image/png",
            },
        });
    });

}

export default addImageGenRoutes;