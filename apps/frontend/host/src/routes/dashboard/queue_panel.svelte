<script>
    const {approveAll, rejectAll, disabled} = $props();
</script>


<div class="flex panel preset-tonal-primary">
    <h3 class="h3 flex-1">Queue Actions:</h3>
    <button {disabled} class="btn preset-filled-success-500" onclick={() => approveAll()}>Approve All</button>
    <button {disabled} class="btn preset-filled-error-500" onclick={() => rejectAll()}>Reject All</button>
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