import Button from "./button.svelte";
import Panel from "./panel.svelte";
import Popover from "./popover.svelte";

const DialogComponent = Object.assign(Popover, {
  Button: Button,
  Panel: Panel,
});

export default DialogComponent;
