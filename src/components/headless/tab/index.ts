import Button from "./button.svelte";
import Group from "./group.svelte";
import List from "./list.svelte";
import Panel from "./panel.svelte";
import Panels from "./panels.svelte";
import Tab from "./tab";

const TabComponent = Object.assign(Tab, {
  Button: Button,
  Group: Group,
  List: List,
  Panels: Panels,
  Panel: Panel,
});

export default TabComponent;
