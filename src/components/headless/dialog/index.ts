import Description from "./description.svelte";
import Dialog from "./dialog.svelte";
import Footer from "./footer.svelte";
import Panel from "./panel.svelte";
import Title from "./title.svelte";

const DialogComponent = Object.assign(Dialog, {
  Description: Description,
  Footer: Footer,
  Panel: Panel,
  Title: Title,
});

export default DialogComponent;
