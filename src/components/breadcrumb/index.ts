import Breadcrumb from "./breadcrumb.svelte";
import Link from "./link.svelte";

const BreadcrumbComponent = Object.assign(Breadcrumb, {
  Link: Link,
});

export default BreadcrumbComponent;
