import Pagination from "./pagination.svelte";
import Link from "./link.svelte";

const PaginationComponent = Object.assign(Pagination, {
  Link: Link,
});

export default PaginationComponent;
