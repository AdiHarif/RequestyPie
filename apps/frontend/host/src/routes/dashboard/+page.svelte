
<script lang="ts">
    import { AppBar } from '@skeletonlabs/skeleton-svelte';

    import { onMount } from "svelte";

    import RequestPanel from "./request_panel.svelte";

    const uri = '/api/song-requests';

    let requests: any[] = $state([])
    let username = $state('');

    let promise = $state();
    onMount(() => {
        promise = fetch(uri).then(res => res.json()).then(data => {
            username = data.username;
            requests = data.requests;
        });
    });

    const actionCallback = (id: number) => {
        requests = requests.filter(request => request.id !== id);
    }

</script>



<div class="list">
{#await promise}
    <p>Loading...</p>
{:then _}

    <AppBar headlineClasses="ml-[15%]">
        {#snippet headline()}
            <h2 class="h2">{username}'s Listening Queue requests</h2>
        {/snippet}
    </AppBar>

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