
<script lang="ts">
  import { Modal } from '@skeletonlabs/skeleton-svelte';

  import SettingsIcon from "lucide-svelte/icons/settings";
  import SettingsDrawer from './settings_drawer.svelte';

  let drawerState = $state(false);
</script>

<Modal
  bind:open={drawerState}
  triggerClasses="btn-icon rounded-full preset-tonal"
  contentBase="bg-surface-100-900 p-4 space-y-4 shadow-xl w-[480px] h-screen"

  positionerJustify="justify-end"
  transitionsPositionerIn={{ x: 480, duration: 200 }}
  transitionsPositionerOut={{ x: 480, duration: 200 }}
>
  {#snippet trigger()}
    <SettingsIcon/>
  {/snippet}
  {#snippet content()}
    <SettingsDrawer/>
  {/snippet}
</Modal>
