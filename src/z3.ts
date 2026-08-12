import { init } from "z3-solver";
import type { Context } from "z3-solver";

let contextPromise: Promise<Context<"main">> | undefined;

export function getContext(): Promise<Context<"main">> {
  if (!contextPromise) {
    contextPromise = init().then(({ Context }) => Context("main"));
  }
  return contextPromise;
}
