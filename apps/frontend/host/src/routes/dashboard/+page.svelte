
<script lang="ts">
    import { onMount } from "svelte";

    import RequestPanel from "./request_panel.svelte";

    const uri = '/api/song-requests';

    let promise: Promise<any>;
    onMount(() => {
        promise = fetch(uri).then(res => res.json());
    });

</script>

<div class="list">
{#await promise}
    <p>Loading...</p>
{:then data}
    {#each data as songRequest (songRequest.id)}
        <RequestPanel {songRequest} />
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