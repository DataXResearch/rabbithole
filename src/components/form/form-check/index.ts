import FormCheck from "./form-check.svelte";
import Input from "./input.svelte";
import Label from "./label.svelte";

const FormCheckComponent = Object.assign(FormCheck, {
  Input: Input,
  Label: Label,
});

export default FormCheckComponent;
