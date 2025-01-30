
<script lang="ts">
  import { Switch, Accordion } from '@skeletonlabs/skeleton-svelte';

  import Twitch from 'lucide-svelte/icons/twitch';
  import Construction from 'lucide-svelte/icons/construction';

  let switchState = $state(false);

  let value: string[] = $state([]);

  function switchHandler() {
    if (!switchState) {
      value = ['twitch'];
    };
  }
</script>


<header class="flex justify-between">
  <h2 class="h2">Settings</h2>
</header>
<Accordion {value} collapsible>
  <Accordion.Item value="twitch">
    <!-- Control -->
    {#snippet lead()}<Twitch size={24} />{/snippet}
    {#snippet control()}
      <div class="flex justify-between items-center">
        <span>Twitch</span>
        <button onclick={(e) => {e.stopPropagation() ; switchHandler()}}>
          <Switch name="switch" bind:checked={switchState}/>
        </button>
      </div>
    {/snippet}
    <!-- Panel -->
    {#snippet panel()}
    <label class="label">
      <span class="label-text">Twitch User:</span>
      <!--
        TODO: Replace this div with a form group after this issue is resolved: https://github.com/skeletonlabs/skeleton/issues/2985
      -->
      <div class="flex items-center space-x-2">
        <input class="input" type="text" placeholder="Username" />
        <button class="btn preset-filled-success-500 h-full">Login with Twitch</button>
      </div>
    </label>
    {/snippet}
  </Accordion.Item>
  <hr class="hr" />
  <Accordion.Item value="discord" disabled>
    {#snippet lead()}<Construction size={24}/>{/snippet}
    {#snippet control()}Discord (Comming Soon!){/snippet}
  </Accordion.Item>
</Accordion>
