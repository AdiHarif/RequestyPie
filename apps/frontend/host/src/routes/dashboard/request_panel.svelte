<script>
    const { songRequest } = $props();
</script>


<div class="panel">
    <div class="info">
        <p>
            <span style="font-weight: bold;">{songRequest.trackInfo.name}</span>
            by
            <span style="font-weight: bold;">{songRequest.trackInfo.artists.map(artist => artist.name)}</span>
        </p>
        <p>Requester: {songRequest.requester}</p>
    </div>
    <button onclick={() => fetch(`http://localhost:8003/api/song-requests/${songRequest.id}/approve`, { method: "PUT" })}>Approve</button>
    <button onclick={() => fetch(`http://localhost:8003/api/song-requests/${songRequest.id}`, { method: "DELETE" })}>Reject</button>
</div>

<style>
    .panel {
        border: 1px solid black;
        padding: 1em;
        margin: 1em;
        display: flex;
        width: 65%;
        justify-content: center;
        align-items: center;
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