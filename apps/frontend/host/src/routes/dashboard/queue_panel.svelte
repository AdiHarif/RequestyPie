<script>
    const {approveAll, rejectAll} = $props();
</script>


<div class="flex panel preset-tonal-primary">
    <h3 class="h3 flex-1">Queue Actions:</h3>
    <button class="btn preset-filled-primary-500" onclick={() => approveAll()}>Approve All</button>
    <button class="btn preset-filled-primary-500" onclick={() => rejectAll()}>Reject All</button>
</div>

<style>
    .panel {
        border: 1px solid black;
        padding: 1em;
        margin: 1em;
        width: 70%;
        align-items: center;
    }

    button {
        margin: 0 0.5em;
        width: 100px;
        height: 40px;
    }
</style>