<script lang="ts">
    const { songRequest, actionCallback } = $props();

    const route = '/api/song-requests';

    const changeRequestStatus = async (status: string) => {
        await fetch(route, {
            method: "PATCH",
            body: JSON.stringify({ requestIds: [songRequest.id], status }),
        });
        actionCallback(songRequest.id);
    }
</script>


<div class="panel preset-tonal-primary">
    <img class="image" src="{songRequest.trackInfo.album.images[0].url}" alt="Album cover" width="100" height="100">
    <div class="info">
        <p>
            <span style="font-weight: bold">{songRequest.trackInfo.name}</span>
            by
            <span style="font-weight: bold;">{songRequest.trackInfo.artists.map((artist: any) => artist.name)}</span>
        </p>
        <p>Requester: {songRequest.requester}</p>
    </div>
    <button class="btn preset-filled-primary-500" onclick={() => changeRequestStatus("approved")}>Approve</button>
    <button class="btn preset-filled-primary-500" onclick={() => changeRequestStatus("denied")}>Reject</button>
</div>

<style>
    .panel {
        border: 1px solid black;
        padding: 1em;
        margin: 1em;
        display: flex;
        width: 70%;
        justify-content: center;
        align-items: center;
    }

    .image {
        margin-right: 1em;
    }

    .info {
        flex: 1;
    }

    button {
        margin: 0 0.5em;
        width: 100px;
        height: 100px;
    }
</style>