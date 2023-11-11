import Button from "./button.svelte";
import Disclosure from "./disclosure";
import Group from "./group.svelte";
import Panel from "./panel.svelte";

const DisclosureComponent = Object.assign(Disclosure, {
  Group: Group,
  Button: Button,
  Panel: Panel,
});

export default DisclosureComponent;
