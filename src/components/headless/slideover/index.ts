import Description from "./description.svelte";
import Footer from "./footer.svelte";
import Panel from "./panel.svelte";
import Slideover from "./slideover.svelte";
import Title from "./title.svelte";

const SlideoverComponent = Object.assign(Slideover, {
  Description: Description,
  Footer: Footer,
  Panel: Panel,
  Title: Title,
});

export default SlideoverComponent;
