<script lang="ts">
    import clsx from "clsx";
    import { darkModeStore, setDarkMode } from "../../store/dark-mode";
  
    const setDarkModeClass = () => {
      const el = document.querySelectorAll("html")[0];
      $darkModeStore.value
        ? el.classList.add("dark")
        : el.classList.remove("dark");
    };
  
    const switchMode = (e) => {
      e.preventDefault();
      setDarkMode(!$darkModeStore.value);
      setDarkModeClass();
    };
  
    setDarkModeClass();
  </script>
  
  <!-- BEGIN: Dark Mode Toggle -->
  <a
    class="fixed bottom-0 right-0 z-50 flex items-center justify-center w-40 h-12 mb-10 mr-10 border rounded-full shadow-md cursor-pointer box"
    on:click={switchMode}
    href="#top"
  >
    <div class="mr-4 text-slate-600 dark:text-slate-200">Dark Mode</div>
    <div
      class={clsx([
        "border w-[38px] h-[24px] p-px outline-none rounded-full relative cursor-pointer",
        "before:content-[''] before:w-[22px] before:h-[22px] before:transition-all before:duration-200 before:shadow-[1px_1px_3px_rgba(0,0,0,0.25)] before:absolute before:inset-y-0 before:my-auto before:rounded-full",
  
        $darkModeStore.value && "bg-primary border-primary",
        $darkModeStore.value && "before:ml-[13px] before:bg-white",
        ,
      ])}
    />
  </a>
  <!-- END: Dark Mode Toggle -->
  