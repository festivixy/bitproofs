export function bitRegister(value: number, width: number): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "bit-register";

  const register = document.createElement("span");
  register.className = "register";
  for (let i = width - 1; i >= 0; i--) {
    const bit = document.createElement("span");
    const isSet = ((value >>> i) & 1) === 1;
    bit.className = `bit bit-flip-in ${isSet ? "bit-set" : "bit-clear"}`;
    register.appendChild(bit);
  }
  wrap.appendChild(register);

  const label = document.createElement("span");
  label.className = "bit-register-label dim";
  label.textContent = `0b${value.toString(2).padStart(width, "0")} = ${value}`;
  wrap.appendChild(label);

  return wrap;
}
