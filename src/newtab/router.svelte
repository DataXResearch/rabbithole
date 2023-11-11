<script lang="ts">
    import { onDestroy } from "svelte";
    import { Route, Router, createHistory, createMemorySource } from "svelte-navigator";
    import Navbar from "../components/layout/navbar.svelte";
    import ToTop from "../components/to-top.svelte";
    import LandingView from "./views/landing.svelte";

	/**
	 * A callback you can use to check if a navigation has occurred.
	 * It will be called with the new location and the action that lead
	 * to the navigation.
	 */
	export let onNavigate = () => {};
	
	/** Supply an initial location to the Router */
	export let initialPathname = "/";

	const history = createHistory(createMemorySource(initialPathname));

	const unlisten = history.listen(onNavigate);

	onDestroy(unlisten);
</script>

<Router primary={false} {history}>
    <ToTop />
    <Navbar>
        <Route path="/">
            <LandingView/>
        </Route>
    </Navbar>   
</Router>