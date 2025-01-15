
import type { RequestHandler } from '@sveltejs/kit';

export const PUT: RequestHandler = async (event) => {
    const uri = `http://localhost:8001/song-request/${event.params.id}/approve`;
    return fetch(uri,
        {
            method: 'PUT',
            credentials: "include",
            headers: {
                cookie: event.request.headers.get('cookie') || ''
            }
        });
    };