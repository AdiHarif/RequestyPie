
import type { RequestHandler } from '@sveltejs/kit';

export const DELETE: RequestHandler = async (event) => {
    const uri = `http://localhost:8001/song-request/${event.params.id}`;
    return fetch(uri,
        {
            method: 'DELETE',
            credentials: "include",
            headers: {
                cookie: event.request.headers.get('cookie') || ''
            }
        });
    };