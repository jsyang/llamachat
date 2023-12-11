// Just an example. not code used in app.

import { Ai } from '@cloudflare/ai';
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);

/* ... */

export default {
    async fetch(request, env, ctx) {
        if (request.method === "POST") {
            const {messages} = await request.json();
            const ai = new Ai(env.AI);

            const stream = await ai.run('@cf/meta/llama-2-7b-chat-int8', {
                messages,
                stream: true,
            });

            return new Response(stream, {
                headers: {
                    "content-type": "text/event-stream",
                },
            });
        } else {
            /* ... */
            try {
                // Add logic to decide whether to serve an asset or run your original Worker code
                return await getAssetFromKV(
                    {
                        request,
                        waitUntil: ctx.waitUntil.bind(ctx),
                    },
                    {
                        ASSET_NAMESPACE: env.__STATIC_CONTENT,
                        ASSET_MANIFEST: assetManifest,
                    }
                );
            } catch (e) {
                let pathname = new URL(request.url).pathname;
                return new Response(`"${pathname}" not found`, {
                    status: 404,
                    statusText: 'not found',
                });
            }
        }
    },
};