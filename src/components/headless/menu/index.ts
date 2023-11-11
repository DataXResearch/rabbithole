import Button from "./button.svelte";
import Divider from "./divider.svelte";
import Footer from "./footer.svelte";
import Header from "./header.svelte";
import Item from "./item.svelte";
import Items from "./items.svelte";
import Menu from "./menu.svelte";

const MenuComponent = Object.assign(Menu, {
  Button: Button,
  Items: Items,
  Item: Item,
  Divider: Divider,
  Header: Header,
  Footer: Footer,
});

export default MenuComponent;
