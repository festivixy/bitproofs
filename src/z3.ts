import { init } from "z3-solver";

let contextPromise: Promise<any> | undefined;

export function getContext(): Promise<any> {
  if (!contextPromise) {
    contextPromise = init().then(({ Context }) => Context("main"));
  }
  return contextPromise;
}
