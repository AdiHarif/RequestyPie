
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

import { createJWT } from '$lib/jwt';

export const GET: RequestHandler = async (event) => {
    const uri = 'http://localhost:8001/song-request';

    const data = await fetch(uri,
        {
            credentials: "include",
            headers: {
                cookie: event.request.headers.get('cookie') || '',
                authorization: `Bearer: ${await createJWT()}`
            }
        }).then(res => res.json());

    return json(data);
};

export const PATCH: RequestHandler = async (event) => {
    const uri = `http://localhost:8001/song-request`;
    console.log('PATCH', uri);
    const body = await (event.request as Request).text();
    console.log(body);
    return fetch(uri,
        {
            method: 'PATCH',
            credentials: "include",
            headers: {
                cookie: event.request.headers.get('cookie') || '',
                authorization: `Bearer: ${await createJWT()}`
            },
            body
        });
    };

