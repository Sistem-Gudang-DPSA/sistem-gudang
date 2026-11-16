import JumlahInput, { type JumlahInputProps } from "../../JumlahInput";
import { peringatanJumlah } from "../form-utils";

export default function JumlahPengambilanInput(props: Omit<JumlahInputProps, "validate">) {
  return <JumlahInput {...props} validate={peringatanJumlah} />;
}
