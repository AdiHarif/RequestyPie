
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
    const uri = 'http://localhost:8001/song-request';
    return fetch(uri,
        {
            credentials: "include",
            headers: {
                cookie: event.request.headers.get('cookie') || ''
            }
        });
};
