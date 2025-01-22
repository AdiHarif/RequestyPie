
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
    const uri = 'http://localhost:8001/song-request';

    const data = await fetch(uri,
        {
            credentials: "include",
            headers: {
                cookie: event.request.headers.get('cookie') || ''
            }
        }).then(res => res.json());

    return json(data);
};
