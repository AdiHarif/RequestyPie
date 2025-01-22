
<script lang="ts">
    import { onMount } from "svelte";

    import RequestPanel from "./request_panel.svelte";

    const uri = '/api/song-requests';

    let requests: any[] = $state([])

    let promise = $state();
    onMount(() => {
        promise = fetch(uri).then(res => res.json()).then(data => requests = data);
    });

    const actionCallback = (id: number) => {
        requests = requests.filter(request => request.id !== id);
    }

</script>

<div class="list">
{#await promise}
    <p>Loading...</p>
{:then _}
    {#each requests as songRequest (songRequest.id)}
        <RequestPanel {songRequest} {actionCallback} />
    {:else}
        <p>No requests to show</p>
    {/each}
{:catch error}
    <p>There was an error: {error.message}</p>
{/await}
</div>


<style>
    .list {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
</style>