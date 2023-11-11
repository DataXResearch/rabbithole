import FormSwitch from "./form-switch.svelte";
import Input from "./input.svelte";
import Label from "./label.svelte";

const FormSwitchComponent = Object.assign(FormSwitch, {
  Input: Input,
  Label: Label,
});

export default FormSwitchComponent;
