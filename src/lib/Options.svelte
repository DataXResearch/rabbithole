<script lang="ts">
  import heart from "../assets/icons/heart.png";
  import forbidden from "../assets/icons/forbidden.png";
  import { storage } from "../storage";
  import { MessageRequest } from "../utils"

  export let count: number;
  let successMessage: string = null;

  function increment() {
    count += 1;
  }

  function decrement() {
    count -= 1;
  }

  async function save() {
    const savedTab = await chrome.runtime.sendMessage({type: MessageRequest.SAVE_TAB});
    console.log(savedTab);
  }
</script>

<div class="container">
  <p>Current count: <b>{count}</b></p>
  <div>
    <button on:click={increment}>
      <img {heart} alt="background image" />
    </button>
    <button on:click={decrement}>
      <img {forbidden} alt="background image" />
    </button>
    <!-- <div style="width: 50px; height: 50px;"> -->
    <!--   <Fab on:click={increment} style="width: 50px; height: 50px;"> -->
    <!--     <Icon class="material-icons">favorite</Icon> -->
    <!--   </Fab> -->
    <!-- </div> -->
    <!-- <div style="width: 50px; height: 50px;"> -->
    <!--   <Fab on:click={decrement} style="width: 50px; height: 50px;"> -->
    <!--     <Icon class="material-icons">notinterested</Icon> -->
    <!--   </Fab> -->
    <!-- </div> -->
  </div>
  <div>
    <button on:click={save}>Save</button>
    {#if successMessage}<span class="success">{successMessage}</span>{/if}
  </div>
</div>

<style>
  .container {
    min-width: 250px;
  }

  button {
    border-radius: 2px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    background-color: #2ecc71;
    color: #ecf0f1;
    transition: background-color 0.3s;
    padding: 5px 10px;
    border: none;
  }

  button:hover,
  button:focus {
    background-color: #27ae60;
  }

  .success {
    color: #2ecc71;
    font-weight: bold;
  }
</style>
