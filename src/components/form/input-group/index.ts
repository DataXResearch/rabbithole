import InputGroup from "./input-group.svelte";
import Text from "./text.svelte";

const InputGroupComponent = Object.assign(InputGroup, {
  Text: Text,
});

export default InputGroupComponent;
