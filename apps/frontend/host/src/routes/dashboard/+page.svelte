
<script lang="ts">
    import { AppBar } from '@skeletonlabs/skeleton-svelte';

    import { onMount } from "svelte";

    import QueuePanel from "./queue_panel.svelte";
    import RequestPanel from "./request_panel.svelte";
    import SettingsButton from "./settings_button.svelte";

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

    const replyToAll = async (status: string) => {
        await fetch(uri, {
            method: "PATCH",
            body: JSON.stringify({
                status,
                requestIds: requests.map(request => request.id)
            }),
        });
        requests = [];
    }
    const approveAll = async () => {
        replyToAll("approved");
    }
    const rejectAll = async () => {
        replyToAll("denied");
    }
</script>



<div class="list">
{#await promise}
    <p>Loading...</p>
{:then _}

    <AppBar headlineClasses="ml-[15%]" trailClasses="mr-[15%]">
        {#snippet lead()}
            <!-- Dummy -->
        {/snippet}
        {#snippet trail()}
            <SettingsButton />
        {/snippet}
        {#snippet headline()}
            <h2 class="h2">{username}'s Listening Queue requests</h2>
        {/snippet}
    </AppBar>

    <hr class="hr" />
    <QueuePanel {rejectAll} {approveAll} disabled={requests.length == 0}/>
    <hr class="hr" />

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